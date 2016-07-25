require('dotenv').config({ silent: true })

const test = require('ava')
const Contentful = require('..')
const Spike = require('spike-core')
const path = require('path')
const fs = require('fs')
const rimraf = require('rimraf')
const exp = require('posthtml-exp')

const compilerMock = { options: { spike: { locals: {} } } }

test('errors without an "accessToken"', (t) => {
  t.throws(
    () => { new Contentful({ spaceId: 'xxx' }) }, // eslint-disable-line
    'ValidationError: [spike-contentful constructor] option "accessToken" is required'
  )
})

test('errors without a "spaceId"', (t) => {
  t.throws(
    () => { new Contentful({ accessToken: 'xxx' }) }, // eslint-disable-line
    'ValidationError: [spike-contentful constructor] option "spaceId" is required'
  )
})

test('errors without "addDataTo"', (t) => {
  t.throws(
    () => { new Contentful({ accessToken: 'xxx', spaceId: 'xxx' }) }, // eslint-disable-line
    'ValidationError: [spike-contentful constructor] option "addDataTo" is required'
  )
})

test('initializes with an "accessToken", "spaceId", and "addDataTo"', (t) => {
  const rt = new Contentful({ accessToken: 'xxx', spaceId: 'xxx', addDataTo: {} })
  t.truthy(rt)
})

test.cb('returns valid content', (t) => {
  const locals = {}
  const api = new Contentful({
    accessToken: process.env.accessToken,
    spaceId: process.env.spaceId,
    addDataTo: locals,
    contentTypes: [
      {
        name: 'press',
        id: '4Em9bQeIQowM0QM8o40yOA'
      },
      {
        name: 'blogs',
        id: '633fTeiMaQwE44OsIqSimk'
      }
    ]
  })

  api.run(compilerMock, undefined, () => {
    // console.log("Locals:", JSON.stringify(locals.contentful, null, 2))
    t.is(locals.contentful.press.length, 91)
    t.is(locals.contentful.blogs.length, 100)
    t.end()
  })
})

test.cb('implements request options', (t) => {
  const locals = {}
  const api = new Contentful({
    accessToken: process.env.accessToken,
    spaceId: process.env.spaceId,
    addDataTo: locals,
    contentTypes: [
      {
        name: 'blogs',
        id: '633fTeiMaQwE44OsIqSimk',
        filters: {
          limit: 1
        }
      }
    ]
  })

  api.run(compilerMock, undefined, () => {
    t.is(locals.contentful.blogs.length, 1)
    t.is(locals.contentful.blogs[0].title, 'Always Looking')
    t.end()
  })
})

test.cb('works with custom transform function', (t) => {
  const locals = {}

  const api = new Contentful({
    accessToken: process.env.accessToken,
    spaceId: process.env.spaceId,
    addDataTo: locals,
    contentTypes: [
      {
        name: 'blogs',
        id: '633fTeiMaQwE44OsIqSimk',
        filters: {
          limit: 1
        },
        transform: (entry) => {
          entry.doge = 'wow'
          return entry
        }
      }
    ]
  })

  api.run(compilerMock, undefined, () => {
    t.is(locals.contentful.blogs[0].doge, 'wow')
    t.end()
  })
})

test.cb('implements default transform function', (t) => {
  const locals = {}
  const api = new Contentful({
    accessToken: process.env.accessToken,
    spaceId: process.env.spaceId,
    addDataTo: locals,
    contentTypes: [
      {
        name: 'blogs',
        id: '633fTeiMaQwE44OsIqSimk',
        filters: {
          limit: 1
        }
      }
    ]
  })

  api.run(compilerMock, undefined, () => {
    t.truthy(typeof locals.contentful.blogs[0].title === 'string')
    t.end()
  })
})


test.cb('can disable transform function', (t) => {
  const locals = {}
  const api = new Contentful({
    accessToken: process.env.accessToken,
    spaceId: process.env.spaceId,
    addDataTo: locals,
    contentTypes: [
      {
        name: 'blogs',
        id: '633fTeiMaQwE44OsIqSimk',
        filters: {
          limit: 1
        },
        transform: false
      }
    ]
  })

  api.run(compilerMock, undefined, () => {
    t.truthy(typeof locals.contentful.blogs[0].sys === 'object')
    t.truthy(typeof locals.contentful.blogs[0].fields === 'object')
    t.end()
  })
})

test.cb('works as a plugin to spike', (t) => {
  const projectPath = path.join(__dirname, 'fixtures/default')
  const project = new Spike({
    root: projectPath,
    entry: { main: [path.join(projectPath, 'main.js')] }
  })

  project.on('error', t.end)
  project.on('warning', t.end)
  project.on('compile', () => {
    const src = fs.readFileSync(path.join(projectPath, 'public/index.html'), 'utf8')
    t.truthy(src === '3zjjnxwJWoks0Ym26U2Em0') // IDs listed in output, sans spaces
    rimraf.sync(path.join(projectPath, 'public'))
    t.end()
  })

  project.compile()
})

test.cb('writes json output', (t) => {
  const projectPath = path.join(__dirname, 'fixtures/json')
  const project = new Spike({
    root: projectPath,
    entry: { main: [path.join(projectPath, 'main.js')] }
  })

  project.on('error', t.end)
  project.on('warning', t.end)
  project.on('compile', () => {
    const file = path.join(projectPath, 'public/data.json')
    t.falsy(fs.accessSync(file))
    const src = JSON.parse(fs.readFileSync(path.join(projectPath, 'public/data.json'), 'utf8'))
    t.truthy(src.blogs.length > 1)
    rimraf.sync(path.join(projectPath, 'public'))
    t.end()
  })

  project.compile()
})

test.cb('accepts template object and generates html', (t) => {
  const locals = {}
  const contentful = new Contentful({
    accessToken: process.env.accessToken,
    spaceId: process.env.spaceId,
    addDataTo: locals,
    contentTypes: [
      {
        name: 'blogs',
        id: '633fTeiMaQwE44OsIqSimk',
        filters: {
          limit: 2
        },
        template: {
          path: '../template/template.html',
          output: (item) => `blog_posts/${item.title}.html`
        }
      }
    ]
  })

  const projectPath = path.join(__dirname, 'fixtures/default')
  const project = new Spike({
    root: projectPath,
    posthtml: { defaults: [exp({ locals })] },
    entry: { main: [path.join(projectPath, 'main.js')] },
    plugins: [contentful]
  })

  project.on('error', t.end)
  project.on('warning', t.end)
  project.on('compile', () => {
    const file1 = fs.readFileSync(path.join(projectPath, 'public/blog_posts/Always Looking.html'), 'utf8')
    const file2 = fs.readFileSync(path.join(projectPath, 'public/blog_posts/Carrot Clicks: Our Week in Bodega (Cats), Brackets and Burgers .html'), 'utf8')
    t.is(file1.trim(), '<p>Always Looking</p>')
    t.is(file2.trim(), '<p>Carrot Clicks: Our Week in Bodega (Cats), Brackets and Burgers </p>')
    rimraf.sync(path.join(projectPath, 'public'))
    t.end()
  })

  project.compile()
})
