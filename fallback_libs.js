// Fallback libraries for when CDN fails

// Simple markdown-it fallback
if (typeof window.markdownit === 'undefined') {
    window.markdownit = function() {
        return {
            render: function(markdown) {
                // Very basic markdown to HTML conversion
                return markdown
                    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                    .replace(/\*(.*)\*/gim, '<em>$1</em>')
                    .replace(/\[([^\]]+)\]\(([^\)]+)\)/gim, '<a href="$2">$1</a>')
                    .replace(/!\[([^\]]*)\]\(([^\)]+)\)/gim, '<img alt="$1" src="$2" />')
                    .replace(/```([^`]+)```/gim, '<pre><code>$1</code></pre>')
                    .replace(/`([^`]+)`/gim, '<code>$1</code>')
                    .replace(/^- (.*$)/gim, '<li>$1</li>')
                    .replace(/\n/gim, '<br>');
            }
        };
    };
}

// Simple highlight.js fallback
if (typeof window.hljs === 'undefined') {
    window.hljs = {
        getLanguage: function(lang) {
            return ['javascript', 'python', 'java', 'cpp', 'css', 'html', 'json', 'xml'].includes(lang);
        },
        highlight: function(code, options) {
            return {
                value: '<code>' + code.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code>'
            };
        }
    };
}

// Simple TurndownService fallback
if (typeof window.TurndownService === 'undefined') {
    window.TurndownService = function() {
        this.turndown = function(html) {
            // Very basic HTML to markdown conversion
            return html
                .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n')
                .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n')
                .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n')
                .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
                .replace(/<b>(.*?)<\/b>/gi, '**$1**')
                .replace(/<em>(.*?)<\/em>/gi, '*$1*')
                .replace(/<i>(.*?)<\/i>/gi, '*$1*')
                .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
                .replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, '!$1\n')
                .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gi, '```\n$1\n```\n')
                .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
                .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
                .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
                .replace(/<br[^>]*>/gi, '\n')
                .replace(/<[^>]+>/g, '') // Remove remaining tags
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .trim();
        };
    };
}

// Simple Mermaid fallback
if (typeof window.mermaid === 'undefined') {
    window.mermaid = {
        initialize: function() { console.log('Mermaid fallback initialized'); },
        render: function() { return '<div class="mermaid-fallback">Mermaid diagram placeholder</div>'; }
    };
}

// Simple html2canvas fallback
if (typeof window.html2canvas === 'undefined') {
    window.html2canvas = function() {
        return Promise.reject(new Error('html2canvas not available - screenshot functionality disabled'));
    };
}

console.log('Fallback libraries loaded for offline functionality');