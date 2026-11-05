"""Clean a sample of the National Heritage List for England for Arches import.

Run from anywhere with the ENV313 environment active:

    python historic/historic/data/clean_data.py

Everything is written to data/clean_data/. See write_outputs() for the file list.
"""

from pathlib import Path
import re

import pandas as pd
from pyproj import Transformer

BASE = Path(__file__).resolve().parent
RAW = BASE / "raw" / "Heritage_List.csv"
OUTPUT_DIR = BASE / "clean_data"

SAMPLE_SIZE = 500
SEED = 42
DATE_FORMAT = "%m/%d/%Y %I:%M:%S %p"
GRADES = {"I": "I", "1": "I", "II": "II", "2": "II", "II*": "II*", "2*": "II*"}

# Limits taken from the full list, rounded outwards. Anything outside is not in England.
EASTING_RANGE = (80_000, 660_000)
NORTHING_RANGE = (5_000, 660_000)

# Column names must match file_field_name in pkg/graphs/Listed_Building.mapping.
ARCHES_COLUMNS = ["ResourceID", "Name", "Grade", "Location", "Period"]
REJECT_COLUMNS = [
    "reject_reason",
    "List Entry Number",
    "List Entry Name",
    "Grade",
    "Date first listed",
    "Easting",
    "Northing",
]

SMALL_WORDS = {"a", "an", "and", "at", "by", "for", "from", "in", "of", "on", "the", "to", "with"}
ROMAN_NUMERALS = {"II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII"}

# Whole words only, keeping apostrophes attached. Tokens with digits (20A, K6) are left alone.
WORD = re.compile(r"(?<![\w'])[^\W\d_]+(?:'[^\W\d_]+)?(?![\w'])")

# EPSG:27700 is British National Grid and EPSG:4326 is the WGS84 longitude/latitude Arches
# needs. always_xy=True makes the output longitude first, which is the order WKT uses.
TO_WGS84 = Transformer.from_crs("EPSG:27700", "EPSG:4326", always_xy=True)


def read_list(path):
    # Only a truly empty cell counts as missing, so pandas can't turn a name like "NA" into NaN.
    # utf-8-sig removes the BOM at the start of the source file.
    return pd.read_csv(
        path, encoding="utf-8-sig", dtype=str, keep_default_na=False, na_values=[""]
    )


def clean_grade(grades):
    # Remove spaces first, so that ^GRADE still matches a value with a leading space.
    key = grades.str.upper().str.replace(r"\s+", "", regex=True).str.replace(r"^GRADE", "", regex=True)
    return key.map(GRADES)  # anything unrecognised becomes NaN


def tidy_name(name):
    """Collapse whitespace and convert ALL CAPS names to title case. Others keep their case."""
    if pd.isna(name):
        return name
    name = " ".join(name.split())
    if name != name.upper():
        return name

    def fix_word(match):
        word = match.group()
        if word in ROMAN_NUMERALS:
            return word
        if match.start() > 0 and word.lower() in SMALL_WORDS:
            return word.lower()
        return word.capitalize()

    return WORD.sub(fix_word, name)


def to_wkt(easting, northing):
    """Convert National Grid coordinates to a WKT point in longitude/latitude."""
    lon, lat = TO_WGS84.transform(easting, northing)
    return f"POINT ({lon:.6f} {lat:.6f})"


def clean(df, today=None):
    """Return (good, rejects). Bad rows are never fixed by guessing, only reported.

    Rejects keep their original source values, so you can see what was wrong.
    """
    today = pd.Timestamp.now() if today is None else today
    source = df
    df = df.copy()
    df["ResourceID"] = df["List Entry Number"].str.strip()
    df["Name"] = df["List Entry Name"].map(tidy_name)
    df["Grade"] = clean_grade(df["Grade"])
    df["first_listed"] = pd.to_datetime(
        df["Date first listed"], format=DATE_FORMAT, errors="coerce"
    )
    df["amended"] = pd.to_datetime(
        df["Date of most recent amendment"], format=DATE_FORMAT, errors="coerce"
    )
    easting = pd.to_numeric(df["Easting"], errors="coerce")
    northing = pd.to_numeric(df["Northing"], errors="coerce")

    problems = pd.DataFrame({
        "missing list entry number": df["ResourceID"].isna() | (df["ResourceID"] == ""),
        "duplicate list entry number": df["ResourceID"].notna()
        & df["ResourceID"].duplicated(keep="first"),
        "missing name": df["Name"].isna() | (df["Name"] == ""),
        "bad grade": df["Grade"].isna(),
        "bad coordinates": ~easting.between(*EASTING_RANGE) | ~northing.between(*NORTHING_RANGE),
        "bad date": df["first_listed"].isna() | (df["first_listed"] > today),
    })
    df["reject_reason"] = problems.apply(lambda row: "; ".join(row.index[row]), axis=1)
    bad = df["reject_reason"] != ""
    good = df[~bad].copy()
    rejects = source[bad].assign(reject_reason=df["reject_reason"][bad])

    good["Location"] = [
        to_wkt(e, n) for e, n in zip(easting[~bad], northing[~bad])
    ]
    # There is no Period in the source data. first_listed is when a building was listed,
    # not when it was built, so it can't be used to work Period out. The node is optional.
    good["Period"] = ""
    return good.sort_values("ResourceID"), rejects


def make_seeded(sample):
    """Copy some real rows and damage them on purpose, to prove clean() catches each problem.

    This data is NOT real: every changed row is named in the seeded_issue column.
    """
    cases = [
        ("grade written as 2*", "Grade", "2*"),
        ("grade in lower case", "Grade", "grade ii"),
        ("grade with extra space", "Grade", " II * "),
        ("grade written as 1", "Grade", "1"),
        ("name with extra spaces", "List Entry Name", "  CHURCH OF  ST MARY  "),
        ("grade does not exist", "Grade", "III"),
        ("grade missing", "Grade", None),
        ("impossible date", "Date first listed", "31/31/1987 12:00:00 AM"),
        ("date missing", "Date first listed", None),
        ("date in the future", "Date first listed", "1/1/2030 12:00:00 AM"),
        ("easting missing", "Easting", None),
        ("easting not a number", "Easting", "unknown"),
        ("northing outside England", "Northing", "9999999"),
        ("name missing", "List Entry Name", None),
        ("name only spaces", "List Entry Name", "   "),
        ("list entry number missing", "List Entry Number", None),
    ]
    seeded = sample.head(len(cases) + 4).copy().reset_index(drop=True)
    seeded.insert(0, "seeded_issue", "")
    for i, (issue, column, value) in enumerate(cases):
        seeded.loc[i, ["seeded_issue", column]] = [issue, value]

    duplicate = seeded.iloc[[-1]].copy()
    duplicate["seeded_issue"] = "duplicate of the row above"
    return pd.concat([seeded, duplicate], ignore_index=True)


def pick_test_rows(good):
    """Five rows for a first import, covering every grade: one I, one II*, three II."""
    picks = [good[good["Grade"] == grade].head(n) for grade, n in [("I", 1), ("II*", 1), ("II", 3)]]
    return pd.concat(picks).sort_values("ResourceID")


def summarise(sample, good, rejects, seeded, seeded_good, seeded_rejects):
    names_changed = (sample["List Entry Name"] != sample["List Entry Name"].map(tidy_name)).sum()
    amended_before_listed = (good["amended"] < good["first_listed"]).sum()
    lines = [
        "REAL SAMPLE",
        f"  rows in:  {len(sample)}",
        f"  rows out: {len(good)}",
        f"  rejected: {len(rejects)}",
        f"  names tidied: {names_changed}",
        f"  amended before first listed (kept, reported only): {amended_before_listed}",
        "  period filled: 0 (not in the source data)",
        "  grades: " + ", ".join(f"{g}={n}" for g, n in good["Grade"].value_counts().items()),
        "",
        "SEEDED TEST FILE (errors added on purpose, not real data)",
        f"  rows in:  {len(seeded)}",
        f"  rows out: {len(seeded_good)}",
        f"  rejected: {len(seeded_rejects)}",
    ]
    reasons = seeded_rejects["reject_reason"].str.split("; ").explode().value_counts()
    lines += [f"    {reason}: {count}" for reason, count in reasons.items()]
    return "\n".join(lines) + "\n"


def write_outputs():
    OUTPUT_DIR.mkdir(exist_ok=True)

    def save(df, name):
        # Plain utf-8 with no BOM: a BOM would corrupt the ResourceID header in Arches.
        df.to_csv(OUTPUT_DIR / name, index=False, encoding="utf-8", lineterminator="\n")

    sample = read_list(RAW).sample(n=SAMPLE_SIZE, random_state=SEED)
    save(sample, "heritage_sample_raw.csv")
    good, rejects = clean(sample)
    save(good[ARCHES_COLUMNS], "listed_buildings_clean.csv")
    save(rejects[REJECT_COLUMNS], "listed_buildings_rejects.csv")
    save(pick_test_rows(good)[ARCHES_COLUMNS], "listed_buildings_test_5.csv")

    save(make_seeded(sample), "SEEDED_heritage_sample.csv")
    seeded = read_list(OUTPUT_DIR / "SEEDED_heritage_sample.csv")
    seeded_good, seeded_rejects = clean(seeded)
    save(seeded_good[["seeded_issue"] + ARCHES_COLUMNS], "SEEDED_clean.csv")
    save(seeded_rejects[["seeded_issue"] + REJECT_COLUMNS], "SEEDED_rejects.csv")

    summary = summarise(sample, good, rejects, seeded, seeded_good, seeded_rejects)
    (OUTPUT_DIR / "cleaning_summary.txt").write_text(summary, encoding="utf-8")
    print(summary)


if __name__ == "__main__":
    write_outputs()
