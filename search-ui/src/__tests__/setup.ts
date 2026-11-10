// jsdom has no layout, so window.scrollTo (used by the router's scroll restore) is a no-op.
window.scrollTo = () => {}
