"""
gzh-design-skill integration service.

Loads theme component libraries, builds system prompts, and orchestrates
AI-powered WeChat article formatting with validation.
"""

import os
import re
import sys
import logging
from typing import Optional
from pathlib import Path

from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Path to the gzh-design-skill directory
GZH_SKILL_DIR = Path(__file__).parent.parent / "gzh-design-skill-main"
REFERENCES_DIR = GZH_SKILL_DIR / "references"
SCRIPTS_DIR = GZH_SKILL_DIR / "scripts"

# Add scripts dir to path so we can import validate_gzh_html
sys.path.insert(0, str(SCRIPTS_DIR))

# Theme cache: theme_id -> file content
_theme_cache: dict[str, str] = {}
_common_components_cache: Optional[str] = None

# Valid theme IDs
VALID_THEMES = [
    "moyu-green",
    "red-white",
    "graphite-minimal",
    "zen-whitespace",
    "moyu-ticket",
    "olive-journal",
]

# Theme auto-selection keywords
THEME_KEYWORDS = {
    "moyu-green": [
        "教程", "测评", "清单", "工具盘点", "知识整理", "方法论",
        "tutorial", "guide", "how to", "step", "步骤", "操作",
    ],
    "red-white": [
        "深度分析", "观点", "力量", "评论", "思考", "反思",
        "opinion", "analysis", "deep", "观点", "论证",
    ],
    "graphite-minimal": [
        "设计", "科技", "专业", "高端", "品牌", "极简",
        "design", "tech", "minimal", "premium",
    ],
    "zen-whitespace": [
        "禅意", "极简生活", "随笔", "冥想", "艺术", "留白",
        "zen", "minimal life", "essay", "meditation",
    ],
    "moyu-ticket": [
        "对比", "评测", "排行", "评分", "星级", "票选",
        "compare", "review", "rating", "versus", "vs",
    ],
    "olive-journal": [
        "内刊", "案例", "复盘", "深度评测", "手记", "系统",
        "case study", "review", "journal", "deep dive",
    ],
}


class GzhFormatRequest(BaseModel):
    """Request model for gzh-design AI formatting."""

    markdown: str
    theme: Optional[str] = None  # theme ID or None for auto-select


class GzhFormatResponse(BaseModel):
    """Response model for gzh-design AI formatting."""

    html: str
    theme_used: str
    validation_errors: list[str] = []
    validation_warnings: list[str] = []
    success: bool = True
    message: str = "Formatted successfully"


def _load_file(path: Path) -> str:
    """Load a file from disk."""
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def load_theme_library(theme_id: str) -> str:
    """Load a theme component library, with caching."""
    if theme_id in _theme_cache:
        return _theme_cache[theme_id]

    path = REFERENCES_DIR / f"theme-{theme_id}.md"
    content = _load_file(path)
    _theme_cache[theme_id] = content
    return content


def load_common_components() -> str:
    """Load the common components library, with caching."""
    global _common_components_cache
    if _common_components_cache is not None:
        return _common_components_cache

    path = REFERENCES_DIR / "common-components.md"
    _common_components_cache = _load_file(path)
    return _common_components_cache


def load_workflow_rules() -> str:
    """Load the condensed workflow rules prompt."""
    from prompts import load_prompt
    return load_prompt("gzh_workflow_rules")


def load_theme_index() -> str:
    """Load the theme index file."""
    path = REFERENCES_DIR / "theme-index.md"
    return _load_file(path)


def build_gzh_system_prompt(theme_id: str) -> str:
    """Build the complete system prompt for gzh formatting.

    Assembles: workflow rules + theme library + common components.
    """
    rules = load_workflow_rules()
    theme_lib = load_theme_library(theme_id)
    common = load_common_components()
    theme_idx = load_theme_index()

    # Extract just the selected theme's row from the index
    theme_row = ""
    for line in theme_idx.splitlines():
        if theme_id.replace("-", " ") in line.lower() or theme_id in line:
            theme_row = line
            break
    # Fallback: include the full index if we can't find the specific row
    if not theme_row:
        theme_row = theme_idx

    prompt = f"""{rules}

## 主题索引（选中的主题信息）

{theme_row}

## 主题组件库（你必须使用这些组件，不要手写 HTML）

{theme_lib}

## 通用增量组件库（代码块、图片/GIF、小标签标题——跨所有主题共用）

{common}

## 重要提醒

- 你输出的 HTML 必须全部来自上面的组件库，不要凭记忆手写任何组件
- 所有文字节点必须用 `<span leaf="">文字</span>` 包裹
- 严格遵守平台红线，不要使用任何禁用标签/属性/样式
- 输出纯 `<section>…</section>` 片段，不要包文档外壳
"""
    return prompt


def select_theme_auto(markdown: str) -> str:
    """Auto-select a theme based on markdown content keywords."""
    text = markdown.lower()
    scores: dict[str, int] = {t: 0 for t in VALID_THEMES}

    for theme_id, keywords in THEME_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in text:
                scores[theme_id] += 1

    # Return the theme with the highest score, default to moyu-green
    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return "moyu-green"
    return best


def run_validation(html: str) -> tuple[list[str], list[str]]:
    """Run validate_gzh_html.py on the generated HTML.

    Returns (errors, warnings).
    """
    try:
        from validate_gzh_html import validate
        errors, warnings, _leaf_count = validate(html, "<api-output>")
        return errors, warnings
    except Exception as e:
        logger.warning(f"Validation script error: {e}")
        return [], [f"Validation script error: {e}"]


def format_gzh(markdown: str, theme: Optional[str] = None) -> GzhFormatResponse:
    """Main entry point: format markdown using gzh-design-skill theme engine.

    This function:
    1. Selects theme (auto or user-specified)
    2. Builds system prompt with theme resources
    3. Calls AI provider
    4. Validates output
    5. Retries once on validation errors
    """
    # Import AI client functions from api module
    from api import get_ai_client, get_ai_model

    # Step 1: Select theme
    if theme and theme in VALID_THEMES:
        theme_id = theme
    elif theme:
        return GzhFormatResponse(
            html="",
            theme_used="",
            success=False,
            message=f"Invalid theme: {theme}. Valid themes: {', '.join(VALID_THEMES)}",
        )
    else:
        theme_id = select_theme_auto(markdown)

    logger.info(f"Using theme: {theme_id}")

    # Step 2: Build prompt
    system_prompt = build_gzh_system_prompt(theme_id)

    # Step 3: Call AI
    try:
        client = get_ai_client()
        model = get_ai_model("formatting")

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请将以下 Markdown 文章排版为公众号 HTML：\n\n{markdown}"},
        ]

        response = client.chat.completions.create(
            model=model, messages=messages, temperature=0.6
        )

        message = response.choices[0].message
        html_content = message.content

        # Fallback to reasoning_content if content is empty
        if not html_content and hasattr(message, "reasoning_content"):
            logger.warning("Content empty, using reasoning_content")
            html_content = message.reasoning_content

        if not html_content:
            raise ValueError("AI returned empty response")

    except Exception as e:
        logger.error(f"AI call failed: {e}")
        return GzhFormatResponse(
            html="",
            theme_used=theme_id,
            success=False,
            message=f"AI service error: {str(e)}",
        )

    # Step 4: Validate
    errors, warnings = run_validation(html_content)

    # Step 5: Retry once on errors
    if errors:
        logger.warning(f"Validation errors ({len(errors)}), retrying once...")
        error_feedback = "\n".join(errors)
        retry_messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请将以下 Markdown 文章排版为公众号 HTML：\n\n{markdown}"},
            {"role": "assistant", "content": html_content},
            {"role": "user", "content": f"你生成的 HTML 有以下校验错误，请修复后重新输出完整的 HTML：\n{error_feedback}"},
        ]

        try:
            retry_response = client.chat.completions.create(
                model=model, messages=retry_messages, temperature=0.6
            )
            retry_message = retry_response.choices[0].message
            retry_html = retry_message.content

            if not retry_html and hasattr(retry_message, "reasoning_content"):
                retry_html = retry_message.reasoning_content

            if retry_html:
                html_content = retry_html
                errors, warnings = run_validation(html_content)
        except Exception as e:
            logger.error(f"Retry failed: {e}")

    return GzhFormatResponse(
        html=html_content,
        theme_used=theme_id,
        validation_errors=errors,
        validation_warnings=warnings,
        success=True,
        message="Formatted successfully" if not errors else f"Formatted with {len(errors)} validation issues",
    )
