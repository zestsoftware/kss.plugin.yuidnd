from setuptools import setup, find_packages
import os

version = '1.0'
descfile = open(os.path.join('kss', 'plugin', 'yuidnd', 'README.txt'))
desc = descfile.read().strip()
descfile.close()


setup(name='kss.plugin.yuidnd',
      version=version,
      description="A plugin for KSS that provides drag-and-drop based on yahoo.ui",
      long_description=desc,
      classifiers=[
        "Framework :: Plone",
        "Framework :: Zope2",
        "Framework :: Zope3",
        "Programming Language :: Python",
        "Topic :: Software Development :: Libraries :: Python Modules",
        ],
      keywords='kss plugin drag-and-drop',
      author='Jean-Paul Ladage',
      author_email='j.ladage@zestsoftware.nl',
      url='https://svn.plone.org/svn/collective/kss.plugin.yuidnd/trunk',
      license='GPL',
      packages=find_packages(exclude=['ez_setup']),
      namespace_packages=['kss', 'kss.plugin'],
      include_package_data=True,
      zip_safe=False,
      install_requires=[
          'setuptools',
      ],
      entry_points="""
      [z3c.autoinclude.plugin]
      target = plone
      """,
      )
