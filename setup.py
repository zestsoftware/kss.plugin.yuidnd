from setuptools import setup, find_packages

desc = open('README.txt').read().strip()
history = open('CHANGES.rst').read().strip()

setup(name='kss.plugin.yuidnd',
      version='1.1',
      description="A plugin for KSS that provides drag-and-drop based on yahoo.ui",
      long_description=desc + '\n\n' + history,
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
      url='https://plone.org/products/extreme-management-tool/',
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
