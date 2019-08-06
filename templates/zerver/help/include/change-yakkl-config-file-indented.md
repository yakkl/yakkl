    Open `/usr/local/share/yakkl/integrations/{{ integration_name }}/yakkl_{{ integration_name }}_config.py`
    with your favorite editor, and change the following lines to specify the
    email address and API key for your {{ integration_display_name }} bot:

    ```
    YAKKL_USER = "{{ integration_name }}-bot@example.com"
    YAKKL_API_KEY = "0123456789abcdef0123456789abcdef"
    YAKKL_SITE = "{{ api_url }}"
    ```
