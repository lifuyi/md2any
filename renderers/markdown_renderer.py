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

    def _create_md_instance(self) -> markdown.Markdown:
        """Create a new Markdown instance (thread-safe)"""
        return markdown.Markdown(
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
        md = self._create_md_instance()

        # Preprocess markdown
        processed_markdown = preprocess_markdown(markdown_text)

        # Convert markdown to HTML
        html_content = md.convert(processed_markdown)

        # Apply theme styling
        styled_html = self._apply_theme_styling(html_content, theme, mode, platform)

        return styled_html

    def render_with_custom_styles(
        self,
        markdown_text: str,
        custom_styles: Dict[str, str],
        mode: str = "light-mode",
        platform: str = "wechat",
    ) -> str:
        """Render markdown with custom styles"""
        md = self._create_md_instance()

        # Preprocess markdown
        processed_markdown = preprocess_markdown(markdown_text)

        # Convert markdown to HTML
        html_content = md.convert(processed_markdown)

        # Apply custom styling
        styled_html = self._apply_custom_styling(
            html_content, custom_styles, mode, platform
        )

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

        # Separate pseudo-element selectors from regular selectors
        pseudo_element_rules = []
        regular_selectors = {}

        for selector, style_properties in styles.items():
            if selector in ["container", "innerContainer"]:
                # Skip container styles as they're handled separately
                continue

            # Check if this is a pseudo-element selector
            if "::" in selector:
                pseudo_element_rules.append((selector, style_properties))
            else:
                regular_selectors[selector] = style_properties

        # Apply styles to each regular element
        for selector, style_properties in regular_selectors.items():
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

        # Generate <style> block for pseudo-element rules
        if pseudo_element_rules:
            style_block_parts = []
            for selector, style_properties in pseudo_element_rules:
                # Apply mode and platform adjustments
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

                # Convert inline style format to CSS format
                css_properties = adjusted_style.strip().rstrip(";")
                style_block_parts.append(f"  {selector} {{ {css_properties} }}")

            style_tag = soup.new_tag("style")
            style_tag.string = "\n".join(style_block_parts)
            soup.insert(0, style_tag)

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

        # Separate pseudo-element selectors from regular selectors
        pseudo_element_rules = []
        regular_selectors = {}

        for selector, style_properties in custom_styles.items():
            if selector in ["container", "innerContainer"]:
                # Skip container styles as they're handled separately
                continue

            # Check if this is a pseudo-element selector
            if "::" in selector:
                pseudo_element_rules.append((selector, style_properties))
            else:
                regular_selectors[selector] = style_properties

        # Apply custom styles to each regular element
        for selector, style_properties in regular_selectors.items():
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

        # Generate <style> block for pseudo-element rules
        if pseudo_element_rules:
            style_block_parts = []
            for selector, style_properties in pseudo_element_rules:
                # Apply mode and platform adjustments
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

                # Convert inline style format to CSS format
                css_properties = adjusted_style.strip().rstrip(";")
                style_block_parts.append(f"  {selector} {{ {css_properties} }}")

            style_tag = soup.new_tag("style")
            style_tag.string = "\n".join(style_block_parts)
            soup.insert(0, style_tag)

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
        """Apply dark mode adjustments to inline style using regex for precise matching"""
        import re as _re

        # Color mapping: light hex -> dark hex (no duplicates)
        color_map = {
            # Backgrounds
            "#ffffff": "#1a1a1a", "#fff": "#1a1a1a",
            "#f8f9fa": "#2c3e50", "#f8f8f8": "#2c3e50",
            "#ecf0f1": "#2c3e50", "#f7f7f7": "#2c3e50",
            "#f5f5f5": "#2c3e50", "#fafafa": "#2a2a2a",
            "#faf5f0": "#1a1a1a", "#fffaf5": "#1a1510",
            "#fff5f0": "#1a1510", "#e8f5e9": "#0d1f0d",
            "#fff8e1": "#1f1a10",
            # Text colors
            "#000000": "#ffffff", "#000": "#ffffff",
            "#111111": "#e0e0e0", "#111": "#e0e0e0",
            "#1a1a1a": "#e0e0e0",
            "#333333": "#e8e8e8", "#333": "#e8e8e8",
            "#3f3f3f": "#d0d0d0",
            "#444444": "#c0c0c0", "#444": "#c0c0c0",
            "#555555": "#b0b0b0", "#555": "#b0b0b0",
            "#666666": "#a0a0a0", "#666": "#a0a0a0",
            "#777777": "#999999", "#777": "#999999",
            "#888888": "#999999", "#888": "#999999",
            "#999999": "#888888", "#999": "#888888",
            "#aaaaaa": "#777777", "#aaa": "#777777",
            "#bbbbbb": "#666666", "#bbb": "#666666",
            "#cccccc": "#555555", "#ccc": "#555555",
            "#dddddd": "#444444", "#ddd": "#444444",
            "#eeeeee": "#333333", "#eee": "#333333",
            "#d1d5db": "#6b7280", "#d1d1d1": "#6b7280",
            "#e0e0e0": "#555555", "#e5e7eb": "#4b5563",
            "#f0f0f0": "#3a3a3a", "#ebedf0": "#3a3a3a",
            "#d4d9c9": "#6b7a5a", "#bdc3c7": "#6b7280",
            "#505050": "#333333", "#404040": "#2a2a2a",
            "#2c3e50": "#bdc3c7",
            # Brand colors
            "#1e3a8a": "#60a5fa", "#3b82f6": "#60a5fa",
            "#2563eb": "#60a5fa", "#3498db": "#5dade2",
            "#2980b9": "#5dade2", "#e74c3c": "#f87171",
            "#c0392b": "#f87171", "#27ae60": "#4ade80",
            "#2ecc71": "#4ade80", "#f39c12": "#fbbf24",
            "#ff6a00": "#ff9a4d", "#ff8c00": "#ffb366",
            "#ff9a4d": "#ffcc80", "#833ab4": "#a78bfa",
            "#fd1d1d": "#f87171", "#fcb045": "#fbbf24",
            "#6b8c42": "#86efac", "#00f2fe": "#67e8f9",
            "#9b59b6": "#c084fc", "#e91e63": "#f472b6",
            "#d4af37": "#fbbf24", "#8b1e22": "#f87171",
            "#d4c5a0": "#a89070", "#00ff41": "#4ade80",
            "#0066ff": "#60a5fa", "#1677ff": "#60a5fa",
            "#05d4cd": "#5eead4", "#fa2c19": "#f87171",
            "#5e6fff": "#818cf8", "#8c9eff": "#a5b4fc",
            "#a080d0": "#c4b5fd", "#8863cf": "#a78bfa",
            "#c9a8ee": "#d8b4fe", "#dda0dd": "#d8b4fe",
            "#add8e6": "#93c5fd", "#ffb6c1": "#fda4af",
        }

        # Sort by length descending so longer hex codes match first
        sorted_colors = sorted(color_map.keys(), key=len, reverse=True)
        pattern = _re.compile("|".join(_re.escape(c) for c in sorted_colors))

        def replacer(match):
            return color_map[match.group(0)]

        return pattern.sub(replacer, style)

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
