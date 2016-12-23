const {doc, p, img} = require("prosemirror-model/test/build")
const {Plugin} = require("prosemirror-state")
const {tempEditor} = require("./view")
const {DecorationSet, Decoration} = require("../dist")
const ist = require("ist")

describe("nodeViews prop", () => {
  it("can replace a node's representation", () => {
    let view = tempEditor({doc: doc(p("foo", img)),
                           nodeViews: {image() { return {dom: document.createElement("var")}}}})
    ist(view.content.querySelector("var"))
    ist(!view.content.querySelector("img"))
  })

  it("can override drawing of a node's content", () => {
    let view = tempEditor({
      doc: doc(p("foo")),
      nodeViews: {paragraph(node) {
        let dom = document.createElement("p")
        dom.textContent = node.textContent.toUpperCase()
        return {dom}
      }}
    })
    ist(view.content.querySelector("p").textContent, "FOO")
    view.props.onAction(view.state.tr.insertText("a").action())
    ist(view.content.querySelector("p").textContent, "AFOO")
  })

  it("can register its own update method", () => {
    let view = tempEditor({
      doc: doc(p("foo")),
      nodeViews: {paragraph(node) {
        let dom = document.createElement("p")
        dom.textContent = node.textContent.toUpperCase()
        return {dom, update(node) { dom.textContent = node.textContent.toUpperCase(); return true }}
      }}
    })
    let para = view.content.querySelector("p")
    view.props.onAction(view.state.tr.insertText("a").action())
    ist(view.content.querySelector("p"), para)
    ist(para.textContent, "AFOO")
  })

  it("can provide a contentDOM property", () => {
    let view = tempEditor({
      doc: doc(p("foo")),
      nodeViews: {paragraph() {
        let dom = document.createElement("p")
        return {dom, contentDOM: dom}
      }}
    })
    let para = view.content.querySelector("p")
    view.props.onAction(view.state.tr.insertText("a").action())
    ist(view.content.querySelector("p"), para)
    ist(para.textContent, "afoo")
  })

  it("has its destroy method called", () => {
    let destroyed = false, view = tempEditor({
      doc: doc(p("foo", img)),
      nodeViews: {image() { return {destroy: () => destroyed = true}}}
    })
    ist(!destroyed)
    view.props.onAction(view.state.tr.delete(3, 5).action())
    ist(destroyed)
  })

  it("can query its own position", () => {
    let get, view = tempEditor({
      doc: doc(p("foo", img)),
      nodeViews: {image(_n, _v, getPos) { get = getPos; return {}}}
    })
    ist(get(), 4)
    view.props.onAction(view.state.tr.insertText("a").action())
    ist(get(), 5)
  })

  it("has access to outer decorations", () => {
    let plugin = new Plugin({
      state: {
        init() { return null },
        applyAction(action, prev) { return action.type == "setDeco" ? action.name : prev }
      },
      props: {
        decorations(state) {
          let deco = this.getState(state)
          return deco && DecorationSet.create(state.doc, [Decoration.inline(0, state.doc.content.size, null, {name: deco})])
        }
      }
    })
    let view = tempEditor({
      doc: doc(p("foo", img)),
      plugins: [plugin],
      nodeViews: {image(_n, _v, _p, deco) {
        let dom = document.createElement("var")
        function update(deco) {
          dom.textContent = deco.length ? deco[0].options.name : "[]"
        }
        update(deco)
        return {dom, update(_, deco) { update(deco); return true }}
      }}
    })
    ist(view.content.querySelector("var").textContent, "[]")
    view.props.onAction({type: "setDeco", name: "foo"})
    ist(view.content.querySelector("var").textContent, "foo")
    view.props.onAction({type: "setDeco", name: "bar"})
    ist(view.content.querySelector("var").textContent, "bar")
  })
})