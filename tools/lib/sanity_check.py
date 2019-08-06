import os
import pwd
import sys

def check_venv(filename):
    # type: (str) -> None
    try:
        import django
        import ujson
        import yakkl
        django
        ujson
        yakkl
    except ImportError:
        print("You need to run %s inside a Yakkl dev environment." % (filename,))
        user_id = os.getuid()
        user_name = pwd.getpwuid(user_id).pw_name
        if user_name != 'vagrant' and user_name != 'yakkldev':
            print("If you are using Vagrant, you can `vagrant ssh` to enter the Vagrant guest.")
        else:
            print("You can `source /srv/yakkl-py3-venv/bin/activate` "
                  "to enter the Yakkl development environment.")
        sys.exit(1)
