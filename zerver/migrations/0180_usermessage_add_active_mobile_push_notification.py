# -*- coding: utf-8 -*-
# Generated by Django 1.11.14 on 2018-08-01 23:05
from __future__ import unicode_literals

import bitfield.models
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('zerver', '0179_rename_to_digest_emails_enabled'),
    ]

    operations = [
        migrations.AlterField(
            model_name='archivedusermessage',
            name='flags',
            field=bitfield.models.BitField(['read', 'starred', 'collapsed', 'mentioned', 'wildcard_mentioned', 'summarize_in_home', 'summarize_in_stream', 'force_expand', 'force_collapse', 'has_alert_word', 'historical', 'is_private', 'active_mobile_push_notification'], default=0),
        ),
        migrations.AlterField(
            model_name='usermessage',
            name='flags',
            field=bitfield.models.BitField(['read', 'starred', 'collapsed', 'mentioned', 'wildcard_mentioned', 'summarize_in_home', 'summarize_in_stream', 'force_expand', 'force_collapse', 'has_alert_word', 'historical', 'is_private', 'active_mobile_push_notification'], default=0),
        ),
        migrations.RunSQL(
            '''
            CREATE INDEX IF NOT EXISTS zerver_usermessage_active_mobile_push_notification_id
                ON zerver_usermessage (user_profile_id, message_id)
                WHERE (flags & 4096) != 0;
            ''',
            reverse_sql='DROP INDEX zerver_usermessage_active_mobile_push_notification_id;'
        ),
    ]