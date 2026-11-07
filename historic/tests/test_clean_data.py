"""Unit tests for the heritage list cleaning script. They need no database and no CSV file.

Run from the historic project folder (the one containing manage.py):

    python -m unittest tests.test_clean_data
"""

import re
import unittest

import pandas as pd

from historic.data.clean_data import (
    clean,
    clean_grade,
    pick_test_rows,
    tidy_name,
    to_wkt,
)


def make_row(**overrides):
    row = {
        "List Entry Number": "1021468",
        "List Entry Name": "CHALCOT HOUSE",
        "Grade": "II*",
        "Date first listed": "9/11/1968 12:00:00 AM",
        "Date of most recent amendment": None,
        "Easting": "384294",
        "Northing": "148824",
    }
    return {**row, **overrides}


def run_clean(*rows):
    return clean(pd.DataFrame(rows, dtype=object), today=pd.Timestamp("2026-11-05"))


class CleanGradeTests(unittest.TestCase):
    def test_variants_are_normalised(self):
        raw = ["I", "1", "II", "2", "II*", "2*", "grade ii", "II *", " Grade 2* "]
        expected = ["I", "I", "II", "II", "II*", "II*", "II", "II*", "II*"]
        self.assertEqual(clean_grade(pd.Series(raw)).tolist(), expected)

    def test_unknown_grade_is_not_guessed(self):
        self.assertTrue(clean_grade(pd.Series(["III"])).isna().all())


class TidyNameTests(unittest.TestCase):
    def test_all_caps_becomes_title_case(self):
        self.assertEqual(tidy_name("CHURCH OF ST MARY'S"), "Church of St Mary's")

    def test_tokens_with_digits_and_roman_numerals_are_kept(self):
        self.assertEqual(tidy_name("20 AND 20A HIGH STREET"), "20 and 20A High Street")
        self.assertEqual(tidy_name("K6 TELEPHONE KIOSK"), "K6 Telephone Kiosk")
        self.assertEqual(tidy_name("STATUE OF GEORGE III"), "Statue of George III")

    def test_first_word_is_capitalised_even_if_small(self):
        self.assertEqual(tidy_name("THE OLD FORGE"), "The Old Forge")

    def test_mixed_case_is_kept_but_spacing_is_fixed(self):
        self.assertEqual(
            tidy_name("  20 and  20A Whitbourne Springs "),
            "20 and 20A Whitbourne Springs",
        )


class ToWktTests(unittest.TestCase):
    def test_point_is_longitude_first_and_in_the_right_place(self):
        # Chalcot House, Wiltshire: about 2.2 degrees west and 51.2 degrees north.
        match = re.fullmatch(r"POINT \((-?[\d.]+) (-?[\d.]+)\)", to_wkt(384294, 148824))
        self.assertIsNotNone(match)
        lon, lat = map(float, match.groups())
        self.assertAlmostEqual(lon, -2.2, delta=0.1)
        self.assertAlmostEqual(lat, 51.2, delta=0.1)


class CleanTests(unittest.TestCase):
    def assert_rejected(self, reason, **overrides):
        good, rejects = run_clean(make_row(**overrides))
        self.assertEqual(len(good), 0)
        self.assertIn(reason, rejects.iloc[0]["reject_reason"])

    def test_good_row_is_kept(self):
        good, rejects = run_clean(make_row())
        self.assertEqual(len(rejects), 0)
        row = good.iloc[0]
        self.assertEqual(row["ResourceID"], "1021468")
        self.assertEqual(row["Name"], "Chalcot House")
        self.assertEqual(row["Grade"], "II*")
        self.assertEqual(row["Period"], "")
        self.assertTrue(row["Location"].startswith("POINT (-2."))

    def test_blank_unused_columns_do_not_cause_a_reject(self):
        good, _ = run_clean(make_row(**{"Date of most recent amendment": None}))
        self.assertEqual(len(good), 1)

    def test_dates_are_read_month_first(self):
        good, _ = run_clean(make_row())
        self.assertEqual(good.iloc[0]["first_listed"], pd.Timestamp("1968-09-11"))

    def test_bad_grade_is_rejected(self):
        self.assert_rejected("bad grade", Grade="III")
        self.assert_rejected("bad grade", Grade=None)

    def test_bad_date_is_rejected(self):
        self.assert_rejected(
            "bad date", **{"Date first listed": "31/31/1987 12:00:00 AM"}
        )
        self.assert_rejected("bad date", **{"Date first listed": None})
        self.assert_rejected(
            "bad date", **{"Date first listed": "1/1/2030 12:00:00 AM"}
        )

    def test_bad_coordinates_are_rejected(self):
        self.assert_rejected("bad coordinates", Easting=None)
        self.assert_rejected("bad coordinates", Easting="unknown")
        self.assert_rejected("bad coordinates", Northing="9999999")

    def test_missing_name_is_rejected(self):
        self.assert_rejected("missing name", **{"List Entry Name": None})
        self.assert_rejected("missing name", **{"List Entry Name": "   "})

    def test_missing_list_entry_number_is_rejected(self):
        self.assert_rejected("missing list entry number", **{"List Entry Number": None})

    def test_duplicate_keeps_first_and_rejects_second(self):
        good, rejects = run_clean(make_row(), make_row())
        self.assertEqual(len(good), 1)
        self.assertEqual(
            rejects.iloc[0]["reject_reason"], "duplicate list entry number"
        )

    def test_rejects_keep_the_original_values(self):
        _, rejects = run_clean(make_row(Grade="III"))
        self.assertEqual(rejects.iloc[0]["Grade"], "III")
        self.assertEqual(rejects.iloc[0]["List Entry Name"], "CHALCOT HOUSE")

    def test_all_problems_on_a_row_are_reported(self):
        _, rejects = run_clean(make_row(Grade="III", Easting=None))
        self.assertEqual(rejects.iloc[0]["reject_reason"], "bad grade; bad coordinates")


class PickTestRowsTests(unittest.TestCase):
    def test_five_rows_covering_every_grade(self):
        rows = [
            make_row(**{"List Entry Number": str(i), "Grade": grade})
            for i, grade in enumerate(["I", "II*", "II", "II", "II", "II", "I"])
        ]
        good, _ = run_clean(*rows)
        picked = pick_test_rows(good)
        self.assertEqual(sorted(picked["Grade"]), ["I", "II", "II", "II", "II*"])


if __name__ == "__main__":
    unittest.main()
