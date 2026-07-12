import odoo
from odoo import http

routes = []
for route in http.root.routes:
    routes.append((route['path'], route['methods'], route.get('auth'), route.get('cors')))
for index, (path, methods, auth, cors) in enumerate(routes[:50], 1):
    print(index, path, methods, auth, cors)
print('Total routes:', len(routes))
