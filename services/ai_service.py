# -*- coding: utf-8 -*-
"""
AI Service - Request/Response models for AI operations
"""

from pydantic import BaseModel, Field
from typing import Optional


class AIRequest(BaseModel):
    """Base AI request model"""
    prompt: str = Field(..., description="The prompt to send to AI")
    context: str = Field(default="", description="Optional context for the AI")


class AIResponse(BaseModel):
    """Base AI response model"""
    response: str = Field(..., description="The AI response")
    success: bool = Field(default=True, description="Whether the request was successful")
    message: str = Field(
        default="AI response generated successfully",
        description="Status message"
    )


class GenerateMarkdownRequest(BaseModel):
    """Request to generate markdown from a prompt"""
    prompt: str = Field(..., description="The prompt for markdown generation")


class GenerateMarkdownResponse(BaseModel):
    """Response containing generated markdown"""
    markdown: str = Field(..., description="The generated markdown content")
    success: bool = Field(default=True, description="Whether generation was successful")
    message: str = Field(
        default="Markdown generated successfully",
        description="Status message"
    )


class TextToMarkdownRequest(BaseModel):
    """Request to convert plain text to markdown"""
    text: str = Field(..., description="The plain text to convert")
    style: str = Field(
        default="standard",
        description="The markdown style to use (standard, academic, blog, technical)"
    )
    preserve_formatting: bool = Field(
        default=True,
        description="Whether to preserve original formatting"
    )


class TextToMarkdownResponse(BaseModel):
    """Response containing markdown converted from text"""
    markdown: str = Field(..., description="The converted markdown content")
    success: bool = Field(default=True, description="Whether conversion was successful")
    message: str = Field(
        default="Text converted to markdown successfully",
        description="Status message"
    )


class FormatMarkdownRequest(BaseModel):
    """Request to format markdown"""
    markdown: str = Field(..., description="The markdown content to format")


class FormatMarkdownResponse(BaseModel):
    """Response containing formatted markdown as HTML"""
    html: str = Field(..., description="The formatted HTML output")
    success: bool = Field(default=True, description="Whether formatting was successful")
    message: str = Field(
        default="Markdown formatted successfully",
        description="Status message"
    )
