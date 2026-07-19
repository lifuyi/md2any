from themes import load_themes

STYLES = load_themes()


def get_style(style_name):
    return STYLES.get(style_name, {})


def list_styles():
    return list(STYLES.keys())
