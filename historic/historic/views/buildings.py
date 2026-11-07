from collections import defaultdict
from math import ceil

from arches.app.models.models import ResourceInstance, TileModel, Value
from django.http import JsonResponse
from django.views.decorators.http import require_GET

GRAPH_ID = "b306c3c3-ee3f-4200-994b-ebc0520b9b0a"
NAME_NODE = "2dbf3318-c12a-4298-ad05-b36bad8da94c"
GRADE_NODE = "9fd254ea-f5a2-43d0-818d-a72b8120a8f4"
LOCATION_NODE = "48a7d034-ca00-4e46-a26c-7b510c6a5abc"
PERIOD_NODE = "3254c8cc-f8e5-4a8d-941f-bb7146ef010b"

NHLE_URL = "https://historicengland.org.uk/listing/the-list/list-entry/{}"

GRADE_IDS = {
    "I": "99eabc7e-4380-49e2-baf3-9274888eeb40",
    "II*": "b3a63650-661d-4c69-aaa4-2142fdd8a293",
    "II": "bcd426dd-421d-4e43-b4dc-7102673b9e7c",
}
GRADE_NAMES = {option_id: name for name, option_id in GRADE_IDS.items()}

PAGE_SIZE = 20


def find_buildings(grade="", query=""):
    """Return Listed Buildings in a fixed order, optionally filtered by grade and name.

    The order must not change between requests, or buildings could repeat or go missing
    across pages. The ID breaks ties, because different buildings can share a name.

    This reads the tiles directly, so it skips Arches' permission checks. That's deliberate:
    the National Heritage List is public, and these endpoints are read-only.
    """
    buildings = ResourceInstance.objects.filter(graph_id=GRAPH_ID)
    if grade:
        # A tile stores the grade as its option UUID, under the Grade node's ID.
        grade_tiles = TileModel.objects.filter(
            **{f"data__{GRADE_NODE}": GRADE_IDS[grade]}
        )
        buildings = buildings.filter(
            resourceinstanceid__in=grade_tiles.values("resourceinstance_id")
        )
    if query:
        # A tile stores the name as {"en": {"value": "...", "direction": "ltr"}}.
        name_tiles = TileModel.objects.filter(
            **{f"data__{NAME_NODE}__en__value__icontains": query}
        )
        buildings = buildings.filter(
            resourceinstanceid__in=name_tiles.values("resourceinstance_id")
        )
    return buildings.order_by("descriptors__en__name", "resourceinstanceid").values(
        "resourceinstanceid", "legacyid"
    )


def fetch_tiles_by_building(building_ids):
    """Return {building ID: [tile data, ...]} using one query, however many buildings there are."""
    tiles = TileModel.objects.filter(resourceinstance_id__in=building_ids)
    tiles_by_building = defaultdict(list)
    for building_id, data in tiles.values_list("resourceinstance_id", "data"):
        tiles_by_building[building_id].append(data)
    return tiles_by_building


def format_location(feature_collection):
    """Return {lon, lat} for the first feature if it's a point, otherwise None."""
    features = (feature_collection or {}).get("features") or []
    if not features or features[0]["geometry"]["type"] != "Point":
        return None
    lon, lat = features[0]["geometry"]["coordinates"]
    return {"lon": lon, "lat": lat}


def merge_tiles(tiles):
    """Combine a building's tiles into one {node ID: value} dict."""
    values = {}
    for tile in tiles:
        values.update(tile)
    return values


def format_building(building, tiles):
    """Turn a building and its raw tiles into the JSON shape the API returns.

    list_entry is None for buildings that weren't imported from the National Heritage List.
    """
    values = merge_tiles(tiles)
    name = (values.get(NAME_NODE) or {}).get("en") or {}
    return {
        "id": str(building["resourceinstanceid"]),
        "list_entry": building["legacyid"],
        "name": name.get("value"),
        "grade": GRADE_NAMES.get(values.get(GRADE_NODE)),
        "location": format_location(values.get(LOCATION_NODE)),
    }


def format_period(tiles):
    """Return the Period label, or None if it's blank. Period is stored as a Value UUID."""
    period_id = merge_tiles(tiles).get(PERIOD_NODE)
    if not period_id:
        return None
    return Value.objects.filter(pk=period_id).values_list("value", flat=True).first()


def parse_page(raw_page):
    """Return the page number as a whole number from 1 upwards, or None if it isn't valid."""
    try:
        page = int(raw_page)
    except ValueError:
        return None
    return page if page >= 1 else None


@require_GET
def building_list(request):
    grade = request.GET.get("grade", "").strip()
    # PostgreSQL rejects NUL characters in text, so they would otherwise cause a 500.
    query = request.GET.get("q", "").replace("\x00", "").strip()
    if grade and grade not in GRADE_IDS:
        return JsonResponse(
            {
                "error": f"Unknown grade: {grade}",
                "valid_grades": list(GRADE_IDS),
            },
            status=400,
        )

    page = parse_page(request.GET.get("page", "1"))
    if page is None:
        return JsonResponse(
            {"error": "page must be a whole number from 1 upwards"}, status=400
        )

    buildings = find_buildings(grade, query)
    count = buildings.count()
    total_pages = ceil(count / PAGE_SIZE)

    # Checked before querying, so a huge page number can't overflow the database's OFFSET.
    results = []
    if page <= total_pages:
        start = (page - 1) * PAGE_SIZE
        page_of_buildings = list(buildings[start : start + PAGE_SIZE])
        tiles_by_building = fetch_tiles_by_building(
            [building["resourceinstanceid"] for building in page_of_buildings]
        )
        results = [
            format_building(building, tiles_by_building[building["resourceinstanceid"]])
            for building in page_of_buildings
        ]

    return JsonResponse(
        {
            "count": count,
            "page": page,
            "page_size": PAGE_SIZE,
            "total_pages": total_pages,
            "results": results,
        }
    )


@require_GET
def building_detail(request, building_id):
    building = find_buildings().filter(resourceinstanceid=building_id).first()
    if building is None:
        return JsonResponse({"error": "Building not found"}, status=404)

    tiles = fetch_tiles_by_building([building_id])[building_id]
    list_entry = building["legacyid"]
    return JsonResponse(
        {
            **format_building(building, tiles),
            "period": format_period(tiles),
            "nhle_url": NHLE_URL.format(list_entry) if list_entry else None,
        }
    )
