import requests

url = 'http://localhost:8069/api/v1/vehicles'
headers = {
    'Origin': 'http://localhost:4173',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Content-Type, Authorization',
}
for method in ['OPTIONS', 'GET', 'POST']:
    try:
        r = requests.request(method, url, headers=headers, timeout=10)
        print('METHOD', method)
        print('STATUS', r.status_code)
        print('HEADERS', {k: v for k, v in r.headers.items() if k in ['Content-Type', 'Access-Control-Allow-Origin', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Headers']})
        print('BODY', r.text[:400].replace('\n', ' '))
        print('---')
    except Exception as e:
        print('METHOD', method, 'ERROR', e)
