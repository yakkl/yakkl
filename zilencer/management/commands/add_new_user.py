from typing import Any

from django.core.management.base import CommandParser

from zerver.lib.actions import do_create_user
from zerver.lib.management import YakklBaseCommand
from zerver.models import Realm, UserProfile

class Command(YakklBaseCommand):
    help = """Add a new user for manual testing of the onboarding process.
If realm is unspecified, will try to use a realm created by add_new_realm,
and will otherwise fall back to the yakkl realm."""

    def add_arguments(self, parser: CommandParser) -> None:
        self.add_realm_args(parser)

    def handle(self, **options: Any) -> None:
        realm = self.get_realm(options)
        if realm is None:
            realm = Realm.objects.filter(string_id__startswith='realm') \
                                 .order_by('-string_id').first()
        if realm is None:
            print('Warning: Using default yakkl realm, which has an unusual configuration.\n'
                  'Try running `manage.py add_new_realm`, and then running this again.')
            valid_realm = Realm.objects.get(string_id='yakkl')
            domain = 'yakkl.com'
        else:
            valid_realm = realm
            domain = realm.string_id + '.yakkl.com'

        name = '%02d-user' % (UserProfile.objects.filter(email__contains='user@').count(),)
        do_create_user('%s@%s' % (name, domain), 'password', valid_realm, name, name)
