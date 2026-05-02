FROM node:24-bookworm

# System dependencies: git, SQLite tools, jq, Playwright browser deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    sqlite3 \
    jq \
    curl \
    # Playwright Chromium dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user matching macOS UID for bind mount permissions
ARG USER_UID=501
ARG USER_GID=20
RUN groupadd --gid $USER_GID devuser 2>/dev/null || true \
    && useradd --uid $USER_UID --gid $USER_GID -m devuser \
    && mkdir -p /repo && chown devuser:$USER_GID /repo

# Install gosu for entrypoint user switching
RUN apt-get update && apt-get install -y --no-install-recommends gosu && rm -rf /var/lib/apt/lists/*

# Shared Playwright browser cache (writable by devuser for version flexibility)
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers
RUN mkdir -p $PLAYWRIGHT_BROWSERS_PATH \
    && chown devuser:$USER_GID $PLAYWRIGHT_BROWSERS_PATH

# Allow git to work with bind-mounted repos (different owner)
RUN git config --system --add safe.directory '*'

# Claude Code CLI (root でインストール、devuser から実行可能)
RUN npm install -g @anthropic-ai/claude-code

# lefthook for git hooks
RUN curl -fsSL https://github.com/evilmartians/lefthook/releases/download/v1.10.4/lefthook_1.10.4_Linux_x86_64.gz -o lefthook.gz \
    && gunzip lefthook.gz \
    && chmod +x lefthook \
    && mv lefthook /usr/local/bin/lefthook

COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

WORKDIR /workspace
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["sleep", "infinity"]
