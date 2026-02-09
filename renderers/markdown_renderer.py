# -*- coding: utf-8 -*-
"""
Markdown renderer with theme support and platform-specific optimizations
"""

import re
from typing import Dict, Any
import markdown
from bs4 import BeautifulSoup
from utils.markdown_utils import preprocess_markdown


class MarkdownRenderer:
    """Enhanced Markdown renderer with theme support"""

    def __init__(self):
        self.md = markdown.Markdown(
            extensions=["extra", "codehilite", "toc", "tables", "fenced_code"],
            extension_configs={
                "codehilite": {
                    "css_class": "highlight",
                    "use_pygments": True,
                    "noclasses": True,
                }
            },
        )

    def render(
        self,
        markdown_text: str,
        theme: Dict[str, Any],
        mode: str = "light-mode",
        platform: str = "wechat",
    ) -> str:
        """Render markdown to HTML with theme styling"""

        # Preprocess markdown
        processed_markdown = preprocess_markdown(markdown_text)

        # Convert markdown to HTML
        html_content = self.md.convert(processed_markdown)

        # Apply theme styling
        styled_html = self._apply_theme_styling(html_content, theme, mode, platform)

        # Reset markdown instance for next use
        self.md.reset()

        return styled_html

    def render_with_custom_styles(
        self,
        markdown_text: str,
        custom_styles: Dict[str, str],
        mode: str = "light-mode",
        platform: str = "wechat",
    ) -> str:
        """Render markdown with custom styles"""

        # Preprocess markdown
        processed_markdown = preprocess_markdown(markdown_text)

        # Convert markdown to HTML
        html_content = self.md.convert(processed_markdown)

        # Apply custom styling
        styled_html = self._apply_custom_styling(
            html_content, custom_styles, mode, platform
        )

        # Reset markdown instance for next use
        self.md.reset()

        return styled_html

    def _apply_theme_styling(
        self, html_content: str, theme: Dict[str, Any], mode: str, platform: str
    ) -> str:
        """Apply theme styling to HTML content with inline styles"""

        # Get styles from the theme
        styles = theme.get("styles", {})

        # Handle image grid layouts first
        html_content = self._process_image_grids(html_content)

        # Parse HTML with BeautifulSoup
        soup = BeautifulSoup(html_content, "html.parser")

        # Apply styles to each element
        for selector, style_properties in styles.items():
            if selector in ["container", "innerContainer"]:
                # Skip container styles as they're handled separately
                continue

            # Apply mode and platform adjustments to styles
            adjusted_style = style_properties
            if mode == "dark-mode":
                adjusted_style = self._apply_dark_mode_adjustments_to_style(
                    adjusted_style
                )
            if platform == "wechat":
                adjusted_style = self._adjust_for_wechat_style(adjusted_style)
            elif platform == "xiaohongshu":
                adjusted_style = self._adjust_for_xiaohongshu_style(adjusted_style)
            elif platform == "zhihu":
                adjusted_style = self._adjust_for_zhihu_style(adjusted_style)

            # Find matching elements and apply inline styles
            try:
                elements = soup.select(selector)
                for element in elements:
                    existing_style = element.get("style", "")
                    if existing_style and not existing_style.endswith(";"):
                        existing_style += ";"
                    combined_style = f"{existing_style} {adjusted_style}"
                    element["style"] = combined_style.strip()
            except Exception:
                # Skip invalid selectors
                continue

        # Get container styles
        container_style = styles.get("container", "")
        inner_container_style = styles.get("innerContainer", "")

        # Apply adjustments to container styles
        if mode == "dark-mode":
            container_style = self._apply_dark_mode_adjustments_to_style(
                container_style
            )
            inner_container_style = self._apply_dark_mode_adjustments_to_style(
                inner_container_style
            )
        if platform == "wechat":
            container_style = self._adjust_for_wechat_style(container_style)
            inner_container_style = self._adjust_for_wechat_style(inner_container_style)

        # Create container section
        container = soup.new_tag("section", **{"class": "markdown-content"})
        if container_style:
            container["style"] = container_style

        # Add inner container if needed
        if inner_container_style:
            inner_container = soup.new_tag("section", **{"class": "inner-container"})
            inner_container["style"] = inner_container_style
            inner_container.extend(soup.contents)
            container.append(inner_container)
        else:
            container.extend(soup.contents)

        return str(container)

    def _apply_custom_styling(
        self, html_content: str, custom_styles: Dict[str, str], mode: str, platform: str
    ) -> str:
        """Apply custom styling to HTML content"""

        # Handle image grid layouts first
        html_content = self._process_image_grids(html_content)

        # Parse HTML with BeautifulSoup
        soup = BeautifulSoup(html_content, "html.parser")

        # Apply custom styles to each element
        for selector, style_properties in custom_styles.items():
            if selector in ["container", "innerContainer"]:
                # Skip container styles as they're handled separately
                continue

            # Apply mode and platform adjustments to styles
            adjusted_style = style_properties
            if mode == "dark-mode":
                adjusted_style = self._apply_dark_mode_adjustments_to_style(
                    adjusted_style
                )
            if platform == "wechat":
                adjusted_style = self._adjust_for_wechat_style(adjusted_style)
            elif platform == "xiaohongshu":
                adjusted_style = self._adjust_for_xiaohongshu_style(adjusted_style)
            elif platform == "zhihu":
                adjusted_style = self._adjust_for_zhihu_style(adjusted_style)

            # Find matching elements and apply inline styles
            try:
                elements = soup.select(selector)
                for element in elements:
                    existing_style = element.get("style", "")
                    if existing_style and not existing_style.endswith(";"):
                        existing_style += ";"
                    combined_style = f"{existing_style} {adjusted_style}"
                    element["style"] = combined_style.strip()
            except Exception:
                # Skip invalid selectors
                continue

        # Get container styles
        container_style = custom_styles.get("container", "")
        inner_container_style = custom_styles.get("innerContainer", "")

        # Apply adjustments to container styles
        if mode == "dark-mode":
            container_style = self._apply_dark_mode_adjustments_to_style(
                container_style
            )
            inner_container_style = self._apply_dark_mode_adjustments_to_style(
                inner_container_style
            )
        if platform == "wechat":
            container_style = self._adjust_for_wechat_style(container_style)
            inner_container_style = self._adjust_for_wechat_style(inner_container_style)

        # Create container section
        container = soup.new_tag("section", **{"class": "markdown-content"})
        if container_style:
            container["style"] = container_style

        # Add inner container if needed
        if inner_container_style:
            inner_container = soup.new_tag("section", **{"class": "inner-container"})
            inner_container["style"] = inner_container_style
            inner_container.extend(soup.contents)
            container.append(inner_container)
        else:
            container.extend(soup.contents)

        return str(container)

    def _apply_dark_mode_adjustments_to_style(self, style: str) -> str:
        """Apply dark mode adjustments to inline style"""
        # Basic dark mode transformations
        dark_adjustments = {
            "#ffffff": "#1a1a1a",
            "#fff": "#1a1a1a",
            "#333333": "#e8e8e8",
            "#333": "#e8e8e8",
            "#555555": "#b0b0b0",
            "#555": "#b0b0b0",
            "#000000": "#ffffff",
            "#000": "#ffffff",
            "#f8f9fa": "#2c3e50",
            "#ecf0f1": "#2c3e50",
            "#f7f7f7": "#2c3e50",
        }

        adjusted_style = style
        for light_color, dark_color in dark_adjustments.items():
            adjusted_style = adjusted_style.replace(light_color, dark_color)

        return adjusted_style

    def _adjust_for_wechat_style(self, style: str) -> str:
        """Adjust inline style for WeChat platform"""
        # Add !important to all style declarations for WeChat compatibility
        if not style:
            return style

        # Split by semicolons and add !important to each declaration
        declarations = style.split(";")
        adjusted_declarations = []

        for declaration in declarations:
            declaration = declaration.strip()
            if declaration and ":" in declaration:
                if "!important" not in declaration:
                    # Add !important before the semicolon
                    declaration += " !important"
                adjusted_declarations.append(declaration)

        return "; ".join(adjusted_declarations)

    def _adjust_for_xiaohongshu_style(self, style: str) -> str:
        """Adjust inline style for XiaoHongShu platform"""
        return style  # No specific adjustments needed for inline styles

    def _adjust_for_zhihu_style(self, style: str) -> str:
        """Adjust inline style for Zhihu platform"""
        return style  # No specific adjustments needed for inline styles

    def _process_image_grids(self, html_content: str) -> str:
        """Process consecutive images into grid layouts"""
        # This is a simplified version - you can enhance this based on your needs
        # Look for consecutive <img> tags and wrap them in grid containers

        # Pattern to match consecutive images
        img_pattern = r"(<p><img[^>]*></p>\s*)+"

        def replace_img_group(match):
            img_group = match.group(0)
            img_tags = re.findall(r"<img[^>]*>", img_group)
            img_count = len(img_tags)

            if img_count == 1:
                return img_group
            elif img_count == 2:
                return f'<section class="img-grid img-grid-2">{img_group}</section>'
            elif img_count == 3:
                return f'<section class="img-grid img-grid-3">{img_group}</section>'
            else:
                return f'<section class="img-grid img-grid-multi">{img_group}</section>'

        return re.sub(img_pattern, replace_img_group, html_content)
