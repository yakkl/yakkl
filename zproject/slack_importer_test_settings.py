from .settings import *

DATABASES["default"] = {
    "NAME": "yakkl_slack_importer_test",
    "USER": "yakkl_test",
    "PASSWORD": LOCAL_DATABASE_PASSWORD,
    "HOST": "localhost",
    "SCHEMA": "yakkl",
    "ENGINE": "django.db.backends.postgresql",
}
