"""
Example machine-specific settings for a Windows development setup.

Copy this file to settings_local.py in the same folder, then adjust the paths below.
Passwords come from the .env file at the repository root, which settings.py loads.
See .env.example for the values it needs.
"""

import os
from pathlib import Path

# Django only searches for DLLs named up to gdal310, so name the DLL directly.
# Check C:\OSGeo4W\bin for the file name, which changes with the GDAL version.
# On Linux or macOS, GDAL is usually found automatically, so delete this section.
_OSGEO4W = Path(r"C:\OSGeo4W")
GDAL_LIBRARY_PATH = str(_OSGEO4W / "bin" / "gdal313.dll")
GEOS_LIBRARY_PATH = str(_OSGEO4W / "bin" / "geos_c.dll")

# If PROJ_LIB or GDAL_DATA point at another install, such as PostgreSQL's copies,
# GDAL can fail with "OGR failure". These apply to this process only.
os.environ["PROJ_LIB"] = str(_OSGEO4W / "share" / "proj")
os.environ["PROJ_DATA"] = str(_OSGEO4W / "share" / "proj")
os.environ["GDAL_DATA"] = str(_OSGEO4W / "apps" / "gdal" / "share" / "gdal")

DATABASES = {
    "default": {
        "ATOMIC_REQUESTS": False,
        "AUTOCOMMIT": True,
        "CONN_MAX_AGE": 0,
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "HOST": "localhost",
        "NAME": "historic",
        "OPTIONS": {
            "options": "-c cursor_tuple_fraction=1",
        },
        "PASSWORD": os.getenv("Postgres_Password", ""),
        "PORT": "5432",
        "POSTGIS_TEMPLATE": "template_postgis",
        "TEST": {
            "CHARSET": None,
            "COLLATION": None,
            "MIRROR": None,
            "NAME": None,
        },
        "TIME_ZONE": None,
        "USER": "postgres",
    }
}

# A default local Elasticsearch 8 install may serve HTTPS instead. If so, change the
# scheme to "https" and set "verify_certs" as your certificate setup requires.
ELASTICSEARCH_HOSTS = [{"scheme": "http", "host": "localhost", "port": 9200}]
ELASTICSEARCH_CONNECTION_OPTIONS = {
    "request_timeout": 30,
    "basic_auth": ("elastic", os.getenv("Elastic_Password", "")),
}
