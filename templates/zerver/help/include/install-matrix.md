### Install the bridge software

1. Clone the Yakkl API repository, and install its dependencies.

    ```
    git clone https://github.com/yakkl/python-yakkl-api.git
    cd python-yakkl-api
    python3 ./tools/provision
    ```

    This will create a new Python virtualenv. You'll run the bridge service
    inside this virtualenv.

1. Activate the virtualenv by running the `source` command printed
   at the end of the output of the previous step.

1. Install the Matrix bridge software in your virtualenv, by running:

    ```
    pip install -r yakkl/integrations/matrix/requirements.txt
    ```
