# -*- coding: utf-8 -*-
from django.conf import settings
from django.db import migrations
from django.db.backends.postgresql_psycopg2.schema import DatabaseSchemaEditor
from django.db.migrations.state import StateApps

def rename_yakkl_realm_to_yakklinternal(apps: StateApps, schema_editor: DatabaseSchemaEditor) -> None:
    if not settings.PRODUCTION:
        return

    Realm = apps.get_model('zerver', 'Realm')
    UserProfile = apps.get_model('zerver', 'UserProfile')

    if Realm.objects.count() == 0:
        # Database not yet populated, do nothing:
        return

    if Realm.objects.filter(string_id="yakklinternal").exists():
        return

    internal_realm = Realm.objects.get(string_id="yakkl")

    # For safety, as a sanity check, verify that "internal_realm" is indeed the realm for system bots:
    welcome_bot = UserProfile.objects.get(email="welcome-bot@yakkl.com")
    assert welcome_bot.realm.id == internal_realm.id

    internal_realm.string_id = "yakklinternal"
    internal_realm.name = "System use only"
    internal_realm.save()

class Migration(migrations.Migration):

    dependencies = [
        ('zerver', '0236_remove_illegal_characters_email_full'),
    ]

    operations = [
        migrations.RunPython(rename_yakkl_realm_to_yakklinternal)
    ]
