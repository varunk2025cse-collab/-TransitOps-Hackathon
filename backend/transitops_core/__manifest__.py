{
    'name': 'TransitOps Core',
    'version': '1.0',
    'category': 'Operations',
    'summary': 'Smart Transport Operations Platform API',
    'description': """
        End-to-end transport operations platform that digitizes vehicle,
        driver, dispatch, maintenance, and expense management.
    """,
    'author': 'TransitOps Team',
    'depends': ['base', 'mail'],
    'data': [
        'security/security.xml',
        'security/ir.model.access.csv',
    ],
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}
