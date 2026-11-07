"""Tests for the buildings API. They create their own buildings in a temporary test database.

Run from the historic project folder (the one containing manage.py):

    python manage.py test tests.test_buildings_api --settings=tests.test_settings
"""

import json
from pathlib import Path
from uuid import uuid4

from arches.app.models.models import (
    Concept,
    GraphModel,
    Node,
    ResourceInstance,
    TileModel,
    Value,
)
from arches.app.utils.data_management.resource_graphs.importer import import_graph
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.urls import reverse

import historic
from historic.views import buildings as api

GRAPH_FILE = Path(historic.__file__).parent / "pkg" / "graphs" / "ListedBuilding.json"
LIST_URL = "/api/buildings/"


def add_tile(building, node_id, value):
    TileModel.objects.create(
        resourceinstance=building,
        nodegroup_id=Node.objects.get(pk=node_id).nodegroup_id,
        data={node_id: value},
    )


def make_building(name, grade, list_entry=None, lon=-1.5, lat=52.0):
    building = ResourceInstance.objects.create(
        graph_id=api.GRAPH_ID,
        legacyid=list_entry,
        descriptors={"en": {"name": name}},
    )
    add_tile(building, api.NAME_NODE, {"en": {"value": name, "direction": "ltr"}})
    add_tile(building, api.GRADE_NODE, api.GRADE_IDS[grade])
    add_tile(
        building,
        api.LOCATION_NODE,
        {
            "type": "FeatureCollection",
            "features": [
                {
                    "id": str(uuid4()),
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [lon, lat]},
                    "properties": {},
                }
            ],
        },
    )
    return building


class BuildingsApiTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        with open(GRAPH_FILE, encoding="utf-8") as graph_file:
            import_graph(json.load(graph_file)["graph"])

        cls.church = make_building("Church of All Saints", "I", "1023956", -1.72, 51.13)
        cls.chapel = make_building("Chapel of St Mary", "II*", "1000002")
        cls.house = make_building("The Old House", "II", "1000003")
        cls.church_hall = make_building("Church Hall", "II", "1000004")
        cls.no_list_entry = make_building("Zeta Cottage", "II")

    def get_results(self, **params):
        response = self.client.get(LIST_URL, params)
        self.assertEqual(response.status_code, 200)
        return response.json()

    def names(self, **params):
        return [building["name"] for building in self.get_results(**params)["results"]]


class GradeFilterTests(BuildingsApiTestCase):
    def test_returns_only_buildings_with_that_grade(self):
        self.assertEqual(self.names(grade="II*"), ["Chapel of St Mary"])
        self.assertEqual(self.names(grade="I"), ["Church of All Saints"])
        self.assertEqual(
            self.names(grade="II"), ["Church Hall", "The Old House", "Zeta Cottage"]
        )

    def test_unknown_grade_returns_400(self):
        for grade in ["III", "ii"]:
            with self.subTest(grade=grade):
                response = self.client.get(LIST_URL, {"grade": grade})
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.json()["valid_grades"], ["I", "II*", "II"])

    def test_no_grade_returns_every_building(self):
        self.assertEqual(self.get_results()["count"], 5)


class NameSearchTests(BuildingsApiTestCase):
    def test_matches_part_of_a_name_in_any_case(self):
        self.assertEqual(
            self.names(q="CHURCH"), ["Church Hall", "Church of All Saints"]
        )

    def test_combines_with_grade(self):
        self.assertEqual(self.names(q="church", grade="I"), ["Church of All Saints"])

    def test_no_match_returns_an_empty_list(self):
        results = self.get_results(q="no such building")
        self.assertEqual(results["count"], 0)
        self.assertEqual(results["total_pages"], 0)
        self.assertEqual(results["results"], [])

    def test_wildcards_and_nul_characters_are_treated_as_text(self):
        for query in ["%", "_", "\x00"]:
            with self.subTest(query=query):
                expected = 5 if query == "\x00" else 0
                self.assertEqual(self.get_results(q=query)["count"], expected)


class PaginationTests(BuildingsApiTestCase):
    def setUp(self):
        original = api.PAGE_SIZE
        api.PAGE_SIZE = 2
        self.addCleanup(setattr, api, "PAGE_SIZE", original)

    def test_every_building_appears_exactly_once_across_pages(self):
        first = self.get_results(page=1)
        self.assertEqual(first["total_pages"], 3)
        ids = [
            building["id"]
            for page in range(1, 4)
            for building in self.get_results(page=page)["results"]
        ]
        self.assertEqual(len(ids), 5)
        self.assertEqual(len(set(ids)), 5)

    def test_invalid_page_returns_400(self):
        for page in ["0", "-1", "abc", "1.5", ""]:
            with self.subTest(page=page):
                self.assertEqual(
                    self.client.get(LIST_URL, {"page": page}).status_code, 400
                )

    def test_page_past_the_end_is_empty(self):
        for page in ["4", "99999999999999999999999999"]:
            with self.subTest(page=page):
                self.assertEqual(self.get_results(page=page)["results"], [])


class FormattingTests(BuildingsApiTestCase):
    def test_list_item_has_the_expected_shape(self):
        self.assertEqual(
            self.get_results(grade="I")["results"][0],
            {
                "id": str(self.church.pk),
                "list_entry": "1023956",
                "name": "Church of All Saints",
                "grade": "I",
                "location": {"lon": -1.72, "lat": 51.13},
            },
        )

    def test_list_query_count_does_not_grow_with_buildings(self):
        with self.assertNumQueries(self.count_queries(grade="I")):
            self.client.get(LIST_URL)

    def count_queries(self, **params):
        with CaptureQueriesContext(connection) as queries:
            self.client.get(LIST_URL, params)
        return len(queries)


class BuildingDetailTests(BuildingsApiTestCase):
    def get_detail(self, building_id):
        return self.client.get(reverse("building_detail", args=[building_id]))

    def test_returns_the_building_with_an_nhle_link(self):
        response = self.get_detail(self.church.pk)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "id": str(self.church.pk),
                "list_entry": "1023956",
                "name": "Church of All Saints",
                "grade": "I",
                "location": {"lon": -1.72, "lat": 51.13},
                "period": None,
                "nhle_url": "https://historicengland.org.uk/listing/the-list/list-entry/1023956",
            },
        )

    def test_building_without_a_list_entry_has_no_link(self):
        self.assertIsNone(self.get_detail(self.no_list_entry.pk).json()["nhle_url"])

    def test_period_is_returned_as_its_label(self):
        concept = Concept.objects.create(nodetype_id="Concept")
        period = Value.objects.create(
            concept=concept,
            valuetype_id="prefLabel",
            value="Georgian",
            language_id="en",
        )
        add_tile(self.house, api.PERIOD_NODE, str(period.pk))
        self.assertEqual(self.get_detail(self.house.pk).json()["period"], "Georgian")

    def test_unknown_id_returns_404(self):
        response = self.get_detail(uuid4())
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"error": "Building not found"})

    def test_resource_from_another_model_returns_404(self):
        other_graph = GraphModel.objects.create(name="Other model", isresource=True)
        other_resource = ResourceInstance.objects.create(graph=other_graph)
        self.assertEqual(self.get_detail(other_resource.pk).status_code, 404)


class ReadOnlyTests(BuildingsApiTestCase):
    def test_other_methods_are_rejected(self):
        self.assertEqual(self.client.post(LIST_URL).status_code, 405)
        url = reverse("building_detail", args=[self.church.pk])
        self.assertEqual(self.client.delete(url).status_code, 405)
