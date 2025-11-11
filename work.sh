#!/bin/bash

# AA Hrvatska PDF Generator - Work Script
# Simplified workflow management for PDF book generation project

# Function to check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        echo "Error: Not in a git repository"
        exit 1
    fi
}

# Function to get current version from package.json
get_current_version() {
    grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/'
}

# Function to bump version in package.json, changelog.json, and version.json
bump_version() {
    local bump_type=$1
    local current_version=$(get_current_version)

    # Parse version into major.minor.patch
    IFS='.' read -r major minor patch <<< "$current_version"

    case "$bump_type" in
        "major")
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        "minor")
            minor=$((minor + 1))
            patch=0
            ;;
        "patch")
            patch=$((patch + 1))
            ;;
        *)
            echo "Error: Invalid bump type. Use: major, minor, or patch"
            exit 1
            ;;
    esac

    local new_version="$major.$minor.$patch"

    # Update package.json
    sed -i "s/\"version\": \"$current_version\"/\"version\": \"$new_version\"/" package.json

    # Update changelog.json currentVersion
    if [ -f "public/changelog.json" ]; then
        sed -i "s/\"currentVersion\": \"$current_version\"/\"currentVersion\": \"$new_version\"/" public/changelog.json
    fi

    # Update version.json
    if [ -f "public/version.json" ]; then
        sed -i "s/\"version\": \"$current_version\"/\"version\": \"$new_version\"/" public/version.json
    fi

    echo "$new_version"
}

# Function to clean up branches
cleanup_branches() {
    echo "Cleaning up merged branches..."

    # Switch to main branch
    git checkout main
    git pull origin main

    # Delete local branches that have been merged into main
    git branch --merged main | grep -v '^\*\|main\|master\|dev' | xargs -r git branch -d

    # Delete remote branches that have been merged
    git remote prune origin

    echo "✓ Branches cleaned up"
}

# Function to run website update script
run_update() {
    local commit_message="$1"
    local nogit="$2"
    
    if [ "$nogit" = "nogit" ]; then
        echo "Running update script without git operations..."
        bash update_new.sh nogit
    elif [ -n "$commit_message" ]; then
        echo "Running update script with custom commit message: $commit_message"
        bash update_new.sh "$commit_message"
    else
        echo "Running update script with default commit message..."
        bash update_new.sh
    fi
}

# Function to test fonts with Croatian characters
test_fonts() {
    local font_source="$1"
    local chapter_font="$2"
    local text_font="$3"
    
    if [ -z "$font_source" ] || [ -z "$chapter_font" ] || [ -z "$text_font" ]; then
        echo "Usage: w test <system|google> <chapter-font> <text-font>"
        echo "Examples:"
        echo '  w test system "Times New Roman" "Arial"'
        echo '  w test google "Playfair Display" "Open Sans"'
        exit 1
    fi
    
    echo "Testing fonts: $chapter_font + $text_font ($font_source)"
    cd pdf_creator/source
    python test_fonts.py "$font_source" "$chapter_font" "$text_font"
    cd ../..
}

# Function to generate PDFs with configuration-based fonts
generate_pdfs() {
    local font_source="$1"
    local config_name="$2"

    # Support both old and new syntax
    if [ -n "$3" ]; then
        # Old syntax: w pdf <font_source> <chapter_font> <text_font>
        local chapter_font="$2"
        local text_font="$3"
        echo "⚠️  WARNING: Old font syntax detected. Consider using new config-based syntax:"
        echo "   New: w pdf $font_source config_name"
        echo "   Old: w pdf $font_source \"$chapter_font\" \"$text_font\""
        echo ""
        echo "Generating all PDFs with fonts: $chapter_font + $text_font ($font_source)"
        cd pdf_creator/source
        python main.py --books-dir ../../assets/books --output-dir ../pdf --all --fonts "$font_source" "$chapter_font" "$text_font" --verbose
        cd ../..
    else
        # New syntax: w pdf <font_source> <config_name>
        if [ -z "$font_source" ] || [ -z "$config_name" ]; then
            echo "Usage: w pdf <system|google> <config-name>"
            echo "Examples:"
            echo '  w pdf google pdf_config        - Use pdf_config.json with Google fonts'
            echo '  w pdf system config1           - Use config1.json with system fonts'
            echo '  w pdf google config_custom     - Use config_custom.json with Google fonts'
            echo ""
            echo "Legacy syntax (still supported):"
            echo '  w pdf system "Times New Roman" "Arial"'
            echo '  w pdf google "Playfair Display" "Open Sans"'
            exit 1
        fi

        echo "Generating all PDFs using config: $config_name.json ($font_source fonts)"
        cd pdf_creator/source
        python main.py "$font_source" "$config_name" --books-dir ../../assets/books --output-dir ../pdf --all
        cd ../..
    fi

    echo "✓ All PDFs generated successfully!"
    echo "Check pdf_creator/pdf/ directory for the generated files."
}

# Creates a new branch and pushes it to remote
create_task_branch() {
    local branch_name=$1

    # Check if we're on main branch
    if [ "$(git branch --show-current)" != "main" ]; then
        echo "Error: Must be on main branch to start a new task"
        exit 1
    fi

    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD -- || [ -n "$(git ls-files --others --exclude-standard)" ]; then
        echo "Error: You have uncommitted changes in main branch"
        echo "Please commit or stash your changes before starting a new task"
        echo "Tip: Use 'w push' to quickly commit changes to main"
        exit 1
    fi

    # Pull latest changes
    git pull origin main

    # Create and checkout new branch
    git checkout -b "$branch_name"

    # Push to remote and set upstream
    git push -u origin "$branch_name"

    echo "✓ Created and switched to branch: $branch_name"
}

# Finishes a task by merging it into main and running update script
finish_task_and_update() {
    local message=$1
    local current_branch=$(git branch --show-current)

    # Don't allow finishing from main
    if [ "$current_branch" = "main" ]; then
        echo "Error: Already on main branch"
        exit 1
    fi

    # Check if there are any changes to commit
    if ! git diff-index --quiet HEAD -- || [ -n "$(git ls-files --others --exclude-standard)" ]; then
        echo "Committing pending changes..."
        git add .
        git commit -m "$message"
    fi

    # Push current branch
    git push origin "$current_branch"

    # Switch to main and pull
    git checkout main
    git pull origin main

    # Merge the task branch
    git merge "$current_branch" --no-ff -m "$message"

    # Instead of pushing main, run update script
    echo "Running update script with message: $message"
    bash update.sh "$message"

    # Keep the task branch
    echo "✓ Task completed, merged to main, and update script executed"
    echo "✓ Branch '$current_branch' preserved for future reference"
    echo "💡 You can delete it later with: git branch -d $current_branch"
}


# Finishes a task by merging it into main
finish_task() {
    local message=$1
    local bump_type=$2
    local current_branch=$(git branch --show-current)

    # Don't allow finishing from main
    if [ "$current_branch" = "main" ]; then
        echo "Error: Already on main branch"
        exit 1
    fi

    # Check if there are any changes to commit
    if ! git diff-index --quiet HEAD -- || [ -n "$(git ls-files --others --exclude-standard)" ]; then
        echo "Committing pending changes..."
        git add .
        git commit -m "$message"
    fi

    # Push current branch
    git push origin "$current_branch"

    # Switch to main and pull
    git checkout main
    git pull origin main

    # Merge the task branch
    git merge "$current_branch" --no-ff -m "$message"

    # Bump version if specified
    if [ -n "$bump_type" ]; then
        local old_version=$(get_current_version)
        echo ""
        echo "Bumping version ($bump_type)..."
        local new_version=$(bump_version "$bump_type")
        echo "✓ Version bumped: $old_version → $new_version"

        # Commit version bump
        git add package.json public/changelog.json public/version.json
        git commit -m "chore: bump version to $new_version"
    fi

    # Push main
    git push origin main

    # Keep the task branch (don't delete it)
    echo "✓ Task completed and merged to main"
    if [ -n "$bump_type" ]; then
        echo "✓ Version updated to $new_version"
    fi
    echo "✓ Branch '$current_branch' preserved for future reference"
    echo "💡 You can delete it later with: git branch -d $current_branch"
}

# Quick update on main branch with automatic patch version bump
quick_update() {
    local message=${1:-"minor changes"}
    local current_branch=$(git branch --show-current)

    # Only allow on main branch
    if [ "$current_branch" != "main" ]; then
        echo "Error: 'w update' can only be used on main branch"
        echo "Current branch: $current_branch"
        echo "Tip: Use 'w finish' to complete your task first"
        exit 1
    fi

    # Check if there are any changes
    if git diff-index --quiet HEAD -- && [ -z "$(git ls-files --others --exclude-standard)" ]; then
        echo "No changes to commit"
        exit 0
    fi

    # Pull latest changes first
    echo "Pulling latest changes..."
    git pull origin main

    # Commit changes
    echo "Committing changes: $message"
    git add .
    git commit -m "$message"

    # Bump patch version
    local old_version=$(get_current_version)
    echo ""
    echo "Bumping patch version..."
    local new_version=$(bump_version "patch")
    echo "✓ Version bumped: $old_version → $new_version"

    # Commit version bump
    git add package.json public/changelog.json public/version.json
    git commit -m "chore: bump version to $new_version"

    # Push to remote
    echo "Pushing to remote..."
    git push origin main

    echo ""
    echo "✓ Changes committed and pushed"
    echo "✓ Version updated to $new_version"
    echo "💡 This was a patch update - no need to update changelog.json"
}

# Function to abandon current task
abandon_task() {
    local new_branch=$1
    local current_branch=$(git branch --show-current)

    # Don't allow abandoning main
    if [ "$current_branch" = "main" ]; then
        echo "Error: Already on main branch"
        exit 1
    fi

    # Switch to main and force reset working directory
    echo "Switching to main branch and resetting changes..."
    git checkout main
    git pull origin main

    # Reset any modified files to match main branch
    git reset --hard origin/main

    # Clean untracked files and directories
    git clean -fd

    # Delete the old branch
    echo "Deleting branch $current_branch..."
    git branch -D "$current_branch"
    git push origin --delete "$current_branch" 2>/dev/null || true

    # If a new branch name was provided, create it
    if [ -n "$new_branch" ]; then
        create_task_branch "$new_branch"
    fi

    echo "✓ Task abandoned and working directory reset to main"
}

# Function to run Quasar development server
run_quasar_dev() {
    local mode="$1"

    case "$mode" in
    "-d"|"--development")
        echo "Starting Quasar dev server WITHOUT service worker..."
        QUASAR_DEV_MODE=true quasar dev
        ;;
    "-ds"|"--development-sw")
        echo "Starting Quasar dev server WITH service worker..."
        QUASAR_DEV_MODE=false quasar dev
        ;;
    "build")
        echo "Building Quasar app for production..."
        quasar build
        ;;
    "build-pwa")
        echo "Building Quasar PWA..."
        quasar build -m pwa
        ;;
    "serve-pwa")
        echo "Building and serving PWA locally..."
        quasar build -m pwa
        echo ""
        echo "Starting local server on http://localhost:8080"
        echo "Press Ctrl+C to stop"
        echo ""
        npx http-server dist/pwa -p 8080 -c-1
        ;;
    "build-electron")
        echo "Building Quasar Electron app..."
        quasar build -m electron
        ;;
    *)
        echo "Starting Quasar dev server WITHOUT service worker (default)..."
        QUASAR_DEV_MODE=true quasar dev
        ;;
    esac
}

# Function to run Theme Designer UI
run_theme_designer() {
    echo "Starting Theme Designer UI..."
    cd ../theme-designer/UI
    python -m streamlit run app.py
    cd ../../aahrvatska
}

# Function to parse SCSS and generate clean theme file(s)
parse_scss_to_theme() {
    local theme_name="$1"

    if [ -z "$theme_name" ]; then
        echo "Parsing SCSS files to regenerate ALL theme files"
        echo "⚠️  WARNING: This will overwrite all existing theme files!"
        echo "✅ Existing values will be preserved (only comments removed)"
    else
        echo "Parsing SCSS files to regenerate theme: $theme_name"
        echo "⚠️  WARNING: This will overwrite the existing theme file!"
        echo "✅ Existing values will be preserved (only comments removed)"
    fi

    echo ""
    read -p "Continue? (y/N): " confirm

    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        cd ../theme-designer
        if [ -z "$theme_name" ]; then
            # Generate all themes
            python generate_theme_from_scss.py
        else
            # Generate specific theme
            python generate_theme_from_scss.py --theme "$theme_name"
        fi
        cd ../aahrvatska
    else
        echo "Cancelled."
    fi
}

# Main script
check_git_repo

case "$1" in
"start")
    if [ -z "$2" ]; then
        echo "Usage: w start <branch-name>"
        exit 1
    fi
    create_task_branch "$2"
    ;;
"finish")
    if [ -z "$2" ]; then
        echo "Usage: w finish \"commit message\" [major|minor|patch]"
        echo ""
        echo "Examples:"
        echo "  w finish \"Fixed typo\"                    - No version bump"
        echo "  w finish \"Fixed typo\" patch              - Bump patch version (1.0.0 → 1.0.1)"
        echo "  w finish \"Added new feature\" minor       - Bump minor version (1.0.0 → 1.1.0)"
        echo "  w finish \"Major redesign\" major          - Bump major version (1.0.0 → 2.0.0)"
        exit 1
    fi
    finish_task "$2" "$3"
    ;;
"update")
    quick_update "$2"
    ;;
"finish-update")
    if [ -z "$2" ]; then
        echo "Usage: w finish-update \"commit message\""
        exit 1
    fi
    finish_task_and_update "$2"
    ;;
"abandon")
    if [ -z "$2" ]; then
        abandon_task
    else
        abandon_task "$2"
    fi
    ;;
"cleanup")
    cleanup_branches
    ;;
"push")
    if [ "$2" = "nogit" ]; then
        run_update "" "nogit"
    elif [ -n "$2" ]; then
        run_update "$2"
    else
        run_update "update"
    fi
    ;;
"test")
    test_fonts "$2" "$3" "$4"
    ;;
"pdf")
    if [ "$2" = "ui" ]; then
        echo "Starting PDF Configuration UI..."
        cd pdf_creator/source/UI
        python pdf_config_ui.py
        cd ../../..
    else
        generate_pdfs "$2" "$3" "$4"
    fi
    ;;
"q"|"quasar")
    run_quasar_dev "$2"
    ;;
"theme")
    run_theme_designer
    ;;
"parse")
    parse_scss_to_theme "$2"
    ;;
*)
    echo "AA Hrvatska - Work Script"
    echo "========================="
    echo ""
    echo "Usage: w <command> [arguments]"
    echo ""
    echo "Quasar Development Commands:"
    echo "  q, quasar                     - Start dev server WITHOUT service worker (default)"
    echo "  q -d, quasar --development    - Start dev server WITHOUT service worker (explicit)"
    echo "  q -ds, quasar --development-sw - Start dev server WITH service worker (SPA mode)"
    echo "  q build                       - Build production app"
    echo "  q build-pwa                   - Build PWA"
    echo "  q serve-pwa                   - Build and serve PWA locally (http://localhost:8080)"
    echo "  q build-electron              - Build Electron app"
    echo ""
    echo "Theme Designer:"
    echo "  theme                         - Open Theme Designer UI"
    echo "  parse                         - Parse SCSS and regenerate ALL themes (preserves values)"
    echo "  parse <theme-name>            - Parse SCSS and regenerate specific theme (preserves values)"
    echo ""
    echo "Git Workflow Commands:"
    echo "  start <branch-name>                      - Start a new task branch"
    echo "  update [\"message\"]                       - Quick commit on main with patch bump (default: 'minor changes')"
    echo "  finish \"message\" [major|minor|patch]    - Complete task, merge to main, optionally bump version"
    echo "  finish-update \"message\"                 - Complete task, merge to main, and run update"
    echo "  abandon [new-branch]                     - Abandon current task, optionally start new branch"
    echo "  cleanup                                  - Clean up merged branches"
    echo ""
    echo "Website Update Commands:"
    echo "  push \"message\"                - Commit and push with custom message"
    echo "  push                          - Commit and push with default message 'update'"
    echo "  push nogit                    - Run update script without git operations"
    echo ""
    echo "PDF Generation Commands:"
    echo "  test <system|google> <font1> <font2>  - Test fonts with Croatian characters"
    echo "  pdf ui                                - Open PDF Configuration UI"
    echo "  pdf <system|google> <config-name>     - Generate all PDFs using config file"
    echo "  pdf <system|google> <font1> <font2>   - Generate all PDFs with custom fonts (legacy)"
    echo ""
    echo "Examples:"
    echo "  w theme                       - Open Theme Designer UI"
    echo "  w parse                       - Parse SCSS and regenerate ALL themes (preserves values)"
    echo "  w parse ocean                 - Parse SCSS and regenerate ocean theme only"
    echo "  w q                           - Start dev server (no service worker)"
    echo "  w q -ds                       - Start dev server with service worker (SPA mode)"
    echo "  w q serve-pwa                 - Build and test PWA locally"
    echo "  w q build                     - Build production app"
    echo "  w q build-pwa                 - Build PWA"
    echo ""
    echo "  w start pdf-font-system                    - Start new task for PDF font work"
    echo "  w update                                   - Quick commit on main (patch bump, msg: 'minor changes')"
    echo "  w update \"Changed button colors\"           - Quick commit on main with custom message (patch bump)"
    echo "  w finish \"Fixed typo\"                     - Complete task (no version bump)"
    echo "  w finish \"Fixed typo\" patch                - Complete task and bump patch (1.0.0 → 1.0.1)"
    echo "  w finish \"Added feature\" minor             - Complete task and bump minor (1.0.0 → 1.1.0)"
    echo "  w finish \"Major redesign\" major            - Complete task and bump major (1.0.0 → 2.0.0)"
    echo "  w finish-update \"Help system done\"         - Complete task, merge to main and run update"
    echo "  w abandon                                  - Abandon current task"
    echo "  w abandon new-feature                      - Abandon and start new task"
    echo "  w cleanup                                  - Delete all merged branches"
    echo ""
    echo "  w push \"Updated content\"      - Update website with custom commit message"
    echo "  w push                        - Update website with default message"
    echo "  w push nogit                  - Test website update without git operations"
    echo ""
    echo '  w test system "Times New Roman" "Arial"        - Test system fonts'
    echo '  w test google "Playfair Display" "Open Sans"   - Test Google fonts'
    echo '  w pdf ui                                       - Open PDF Configuration UI'
    echo '  w pdf google pdf_config                        - Generate PDFs using pdf_config.json'
    echo '  w pdf system config1                           - Generate PDFs using config1.json'
    echo ""
    exit 1
    ;;
esac
