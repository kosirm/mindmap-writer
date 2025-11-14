#!/bin/bash

get_current_version() {
    local latest_tag=$(git tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -n1 || echo "v0.0.0")
    echo "$latest_tag"
}

# Function to increment version
increment_version() {
    local current_version=${1#v}
    local increment_type=$2

    IFS='.' read -r -a version_array <<<"$current_version"
    local major=${version_array[0]:-0}
    local minor=${version_array[1]:-0}
    local patch=${version_array[2]:-0}

    case "$increment_type" in
    "major") echo "v$((major + 1)).0.0" ;;
    "minor") echo "v${major}.$((minor + 1)).0" ;;
    "patch") echo "v${major}.${minor}.$((patch + 1))" ;;
    esac
}

# Function to create a release
create_release() {
    local increment_type=$1
    local message=$2

    # Check if on main branch
    if [ "$(git branch --show-current)" != "main" ]; then
        echo "Error: Must be on main branch for releases"
        exit 1
    fi

    # Get versions
    local current_version=$(get_current_version)
    local new_version=""

    # Determine new version
    if [[ $increment_type =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        new_version=$increment_type
    else
        case "$increment_type" in
        "major" | "minor" | "patch")
            new_version=$(increment_version "$current_version" "$increment_type")
            ;;
        *)
            echo "Error: Version must be 'major', 'minor', 'patch' or specific version (e.g., v1.2.3)"
            exit 1
            ;;
        esac
    fi

    echo "Creating release $new_version (previous was $current_version)..."
    echo "Message: $message"

    # Pull latest changes
    git pull origin main

    # Update package.json version
    bun version "$new_version" --no-git-tag-version

    # Add both package.json and bun.lockb if they've changed
    git add package.json bun.lockb
    git commit -m "chore: bump version to $new_version"
    git push origin main

    # Create and push tag
    git tag -a "$new_version" -m "Release $new_version: $message"
    git push origin "$new_version"

    echo "✓ Release $new_version created"
    echo ""
    echo "⚠️   VSCode needs to be reloaded before publishing."
    echo "Please:"
    echo "1. Press Ctrl+Shift+P (Windows/Linux) or Cmd+Shift+P (Mac)"
    echo "2. Type 'Reload Window' and press Enter"
    echo "3. After VSCode reloads, run: w publish"
}

# Function to check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        echo "Error: Not in a git repository"
        exit 1
    fi
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
        echo "Tip: Use 'w update' to quickly commit changes to main"
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

# Finishes a task by merging it into main
finish_task() {
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

    # Push main
    git push origin main

    # Delete the task branch
    git branch -d "$current_branch"
    git push origin --delete "$current_branch"

    echo "✓ Task completed and merged to main"
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

    # First, stash any changes to avoid losing work (optional)
    # git stash save "Abandoned changes from $current_branch"

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

# Add this new function after your other function definitions
update_main() {
    # Check if we're on main branch
    if [ "$(git branch --show-current)" != "main" ]; then
        echo "Error: Must be on main branch to update"
        exit 1
    fi

    # Add all changes
    git add .

    # Commit with message
    git commit -m "update main"

    # Push to origin
    git push origin main

    echo "✓ Main branch updated and pushed"
}

# Add this new function
finish_task_force() {
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

    # Force push current branch
    git push -f origin "$current_branch"

    # Switch to main and pull
    git checkout main
    git pull origin main

    # Force merge the task branch
    git merge -X theirs "$current_branch" --no-ff -m "$message"

    # Force push main
    git push -f origin main

    # Delete the task branch
    git branch -D "$current_branch"
    git push origin --delete "$current_branch"

    echo "✓ Task completed and force merged to main"
}

# Function to list all open PRs
list_prs() {
    echo "Fetching open Pull Requests..."
    gh pr list --state open
}

# Function to checkout a PR branch for local testing
checkout_pr() {
    local pr_number=$1

    if [ -z "$pr_number" ]; then
        echo "Usage: w pr-checkout <pr-number>"
        echo "Available PRs:"
        list_prs
        exit 1
    fi

    echo "Checking out PR #$pr_number for local testing..."

    # Fetch the PR branch
    gh pr checkout "$pr_number"

    echo "✓ Checked out PR #$pr_number"
    echo "You can now test the changes locally"
    echo "Use 'w pr-test' to run tests on this PR"
    echo "Use 'w pr-back' to return to main branch"
}

# Function to test the current PR branch
test_pr() {
    local current_branch=$(git branch --show-current)

    if [ "$current_branch" = "main" ]; then
        echo "Error: You're on main branch. Use 'w pr-checkout <pr-number>' first"
        exit 1
    fi

    echo "Testing PR branch: $current_branch"
    echo "Running development server to test changes..."

    # Change to the dreambox-studio directory and run dev server
    cd "$(dirname "$0")"
    cd dreambox-studio
    echo "Running in $(pwd)"

    # Load environment variables
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
    fi

    # Set Vite environment variables for Supabase
    export VITE_SUPABASE_URL="${VITE_SUPABASE_URL}"
    export VITE_SUPABASE_KEY="${VITE_SUPABASE_ANON_KEY}"
    export VITE_SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY}"

    echo "Starting development server for PR testing..."
    echo "Press Ctrl+C when done testing"
    quasar dev
}

# Function to run tests on PR branch
test_pr_unit() {
    local current_branch=$(git branch --show-current)

    if [ "$current_branch" = "main" ]; then
        echo "Error: You're on main branch. Use 'w pr-checkout <pr-number>' first"
        exit 1
    fi

    echo "Running unit tests on PR branch: $current_branch"

    cd "$(dirname "$0")"
    cd dreambox-studio
    echo "Running in $(pwd)"

    # Run tests with coverage
    bun test --coverage
}

# Function to return to main branch after PR testing
return_to_main() {
    local current_branch=$(git branch --show-current)

    if [ "$current_branch" = "main" ]; then
        echo "Already on main branch"
        exit 0
    fi

    echo "Returning to main branch from PR testing..."

    # Switch to main and pull latest
    git checkout main
    git pull origin main

    # Clean up the PR branch locally (optional)
    read -p "Delete local PR branch '$current_branch'? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git branch -D "$current_branch"
        echo "✓ Deleted local PR branch: $current_branch"
    fi

    echo "✓ Back on main branch"
}

# Function to approve and merge a PR
merge_pr() {
    local pr_number=$1
    local merge_method=${2:-"squash"}

    if [ -z "$pr_number" ]; then
        echo "Usage: w pr-merge <pr-number> [merge-method]"
        echo "Merge methods: merge, squash (default), rebase"
        echo "Available PRs:"
        list_prs
        exit 1
    fi

    echo "Merging PR #$pr_number using $merge_method method..."

    # First, make sure we're on main
    git checkout main
    git pull origin main

    # Merge the PR
    case "$merge_method" in
    "merge")
        gh pr merge "$pr_number" --merge
        ;;
    "rebase")
        gh pr merge "$pr_number" --rebase
        ;;
    "squash"|*)
        gh pr merge "$pr_number" --squash
        ;;
    esac

    echo "✓ PR #$pr_number merged successfully"
    echo "Pulling latest changes to main..."
    git pull origin main
}

# Function to view PR details
view_pr() {
    local pr_number=$1

    if [ -z "$pr_number" ]; then
        echo "Usage: w pr-view <pr-number>"
        echo "Available PRs:"
        list_prs
        exit 1
    fi

    echo "Viewing PR #$pr_number details..."
    gh pr view "$pr_number"
}

# Function to list all issues
list_issues() {
    echo "Fetching GitHub Issues..."
    gh issue list --state open
}

# Function to create a new issue
create_issue() {
    local title="$1"
    local body="$2"
    local labels="$3"

    if [ -z "$title" ]; then
        echo "Usage: w issue-create \"Title\" [\"Description\"] [\"label1,label2\"]"
        echo "Example: w issue-create \"Fix login bug\" \"Users can't login with email\" \"bug,urgent\""
        exit 1
    fi

    local cmd="gh issue create --title \"$title\""

    if [ -n "$body" ]; then
        cmd="$cmd --body \"$body\""
    fi

    if [ -n "$labels" ]; then
        cmd="$cmd --label \"$labels\""
    fi

    echo "Creating issue: $title"
    eval $cmd
}

# Function to view issue details
view_issue() {
    local issue_number=$1

    if [ -z "$issue_number" ]; then
        echo "Usage: w issue-view <issue-number>"
        echo "Available issues:"
        list_issues
        exit 1
    fi

    echo "Viewing issue #$issue_number details..."
    gh issue view "$issue_number"
}

# Function to close an issue
close_issue() {
    local issue_number=$1
    local comment="$2"

    if [ -z "$issue_number" ]; then
        echo "Usage: w issue-close <issue-number> [\"closing comment\"]"
        echo "Available issues:"
        list_issues
        exit 1
    fi

    local cmd="gh issue close \"$issue_number\""

    if [ -n "$comment" ]; then
        cmd="$cmd --comment \"$comment\""
    fi

    echo "Closing issue #$issue_number..."
    eval $cmd
}

# Function to list available labels
list_labels() {
    echo "Available labels in this repository:"
    gh label list
}

# Function to list projects
list_projects() {
    echo "Available projects in this repository:"
    gh project list --owner kosirm
}

# Function to list milestones
list_milestones() {
    echo "Available milestones in this repository:"
    gh api repos/:owner/:repo/milestones --jq '.[] | "\(.number): \(.title) (\(.state)) - \(.description // "No description")"'
}

# Function to create a milestone
create_milestone() {
    local title="$1"
    local description="$2"
    local due_date="$3"

    if [ -z "$title" ]; then
        echo "Usage: w milestone-create \"Title\" [\"Description\"] [\"YYYY-MM-DD\"]"
        echo "Example: w milestone-create \"v1.0 Release\" \"First major release\" \"2024-12-31\""
        exit 1
    fi

    local cmd="gh api repos/:owner/:repo/milestones -f title=\"$title\""

    if [ -n "$description" ]; then
        cmd="$cmd -f description=\"$description\""
    fi

    if [ -n "$due_date" ]; then
        cmd="$cmd -f due_on=\"${due_date}T23:59:59Z\""
    fi

    echo "Creating milestone: $title"
    eval $cmd
}

# Enhanced function to create issue with full GitHub features
create_issue_full() {
    local title="$1"
    local body="$2"
    local labels="$3"
    local milestone="$4"
    local assignee="$5"

    if [ -z "$title" ]; then
        echo "Usage: w issue-full \"Title\" [\"Description\"] [\"label1,label2\"] [milestone-number] [assignee]"
        echo ""
        echo "Available labels:"
        gh label list --limit 20 | head -10
        echo ""
        echo "Available milestones:"
        list_milestones
        echo ""
        echo "Example: w issue-full \"Fix login\" \"Users can't login\" \"bug,urgent\" 1 \"kosirm\""
        exit 1
    fi

    local cmd="gh issue create --title \"$title\""

    if [ -n "$body" ]; then
        cmd="$cmd --body \"$body\""
    fi

    if [ -n "$labels" ]; then
        cmd="$cmd --label \"$labels\""
    fi

    if [ -n "$milestone" ]; then
        cmd="$cmd --milestone \"$milestone\""
    fi

    if [ -n "$assignee" ]; then
        cmd="$cmd --assignee \"$assignee\""
    fi

    echo "Creating issue with full options: $title"
    eval $cmd
}

# Function to create a new Quasar component
create_component() {
    local component_name=$1
    local component_type=${2:-"vue"}

    echo "Creating new Quasar component: $component_name"

    # Change to the dreambox-studio directory
    cd "$(dirname "$0")"
    cd dreambox-studio
    echo "Running in $(pwd)"

    case "$component_type" in
    "vue")
        bun run quasar new component "$component_name"
        ;;
    "page")
        bun run quasar new page "$component_name"
        ;;
    "layout")
        bun run quasar new layout "$component_name"
        ;;
    "store")
        bun run quasar new store "$component_name"
        ;;
    *)
        echo "Error: Unknown component type. Use vue, page, layout, or store."
        exit 1
        ;;
    esac

    echo "✓ Component $component_name created"
}

# Function to install dependencies with Bun
install_deps() {
    local package_name=$1
    local dev_flag=$2

    # Change to the dreambox-studio directory
    cd "$(dirname "$0")"
    cd dreambox-studio
    echo "Running in $(pwd)"

    if [ -z "$package_name" ]; then
        echo "Installing all dependencies..."
        bun install
    elif [ "$dev_flag" = "--dev" ] || [ "$dev_flag" = "-D" ]; then
        echo "Installing development dependency: $package_name"
        bun add -D "$package_name"
    else
        echo "Installing dependency: $package_name"
        bun add "$package_name"
    fi

    echo "✓ Dependencies installed"
}

# Add this function at the top of the script
ensure_in_project_dir() {
    # Check if we're in the dreambox-studio directory
    if [ ! -f "package.json" ] && [ -f "dreambox-studio/package.json" ]; then
        # If not, but it exists in a subdirectory, change to it
        echo "Changing to dreambox-studio directory..."
        cd dreambox-studio
    elif [ ! -f "package.json" ] && [ ! -f "dreambox-studio/package.json" ]; then
        echo "Error: Could not find package.json in current or dreambox-studio directory"
        exit 1
    fi
}

# Main script
check_git_repo

case "$1" in
"start")
    if [ -z "$2" ]; then
        echo "Usage: $0 start <branch-name>"
        exit 1
    fi
    create_task_branch "$2"
    ;;
"finish")
    if [ -z "$2" ]; then
        echo "Usage: $0 finish \"commit message\""
        exit 1
    fi
    finish_task "$2"
    ;;
"finish-force")
    if [ -z "$2" ]; then
        echo "Usage: $0 finish-force \"commit message\""
        exit 1
    fi
    finish_task_force "$2"
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
"release")
    if [ -z "$2" ] || [ -z "$3" ]; then
        echo "Usage: w release <type> \"release message\""
        echo "Types:"
        echo "  major  - Breaking changes (x.0.0)"
        echo "  minor  - New features (0.x.0)"
        echo "  patch  - Bug fixes (0.0.x)"
        echo "  v1.2.3 - Specific version"
        echo ""
        echo "Examples:"
        echo "  w release patch \"Bug fixes\""
        echo "  w release minor \"New features added\""
        echo "  w release major \"Breaking changes\""
        echo "  w release v1.2.3 \"Custom version\""
        exit 1
    fi
    create_release "$2" "$3"
    ;;
"publish")
    echo "Building and publishing release..."
    cd "$(dirname "$0")"
    cd dreambox-studio
    echo "Running in $(pwd)"
    node build-scripts/clean-dist.js && bun run publish
    ;;
"dev")
    echo "Starting development server..."
    cd "$(dirname "$0")"
    cd dreambox-studio
    echo "Running in $(pwd)"

    # Function to handle cleanup on exit
    cleanup() {
        echo ""
        echo "Development server stopped."
        exit 0
    }

    # Trap SIGINT (Ctrl+C) and SIGTERM signals
    trap cleanup SIGINT SIGTERM

    echo "Press Ctrl+C to stop the server."
    echo ""

    # Load environment variables from .env file
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
    fi

    # Set Vite environment variables for Supabase
    export VITE_SUPABASE_URL="${VITE_SUPABASE_URL}"
    export VITE_SUPABASE_KEY="${VITE_SUPABASE_ANON_KEY}"
    export VITE_SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY}"

    # Start the development server
    quasar dev

    # This will only execute if quasar dev exits on its own
    exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo "Development server exited with code $exit_code"
        exit $exit_code
    else
        echo "Development server stopped."
        exit 0
    fi
    ;;
"dev:pwa")
    echo "Starting PWA development server..."
    cd "$(dirname "$0")"
    cd dreambox-studio
    echo "Running in $(pwd)"

    # Function to handle cleanup on exit
    cleanup() {
        echo ""
        echo "PWA development server stopped."
        exit 0
    }

    # Trap SIGINT (Ctrl+C) and SIGTERM signals
    trap cleanup SIGINT SIGTERM

    echo "Press Ctrl+C to stop the server."
    echo ""

    # Load environment variables from .env file
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
    fi

    # Set Vite environment variables for Supabase
    export VITE_SUPABASE_URL="${VITE_SUPABASE_URL}"
    export VITE_SUPABASE_KEY="${VITE_SUPABASE_ANON_KEY}"
    export VITE_SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY}"

    # Start the development server and open browser with a higher port number
    quasar dev -m pwa -p 19400 &
    sleep 5 && "$(dirname "$0")/open-browser.sh" http://localhost:19400

    # Wait for the server process
    wait $!

    # This will only execute if quasar dev exits on its own
    exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo "PWA development server exited with code $exit_code"
        exit $exit_code
    else
        echo "PWA development server stopped."
        exit 0
    fi
    ;;
"dev:electron")
    echo "Starting Electron development server..."
    cd "$(dirname "$0")"
    cd dreambox-studio
    echo "Running in $(pwd)"

    # Function to handle cleanup on exit
    cleanup() {
        echo ""
        echo "Electron development server stopped."
        exit 0
    }

    # Trap SIGINT (Ctrl+C) and SIGTERM signals
    trap cleanup SIGINT SIGTERM

    echo "Press Ctrl+C to stop the server."
    echo ""

    # Load environment variables from .env file
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
    fi

    # Set Vite environment variables for Supabase
    export VITE_SUPABASE_URL="${VITE_SUPABASE_URL}"
    export VITE_SUPABASE_KEY="${VITE_SUPABASE_ANON_KEY}"
    export VITE_SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY}"

    # Start the development server with a higher port number
    quasar dev -m electron -p 19500

    # This will only execute if quasar dev exits on its own
    exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo "Electron development server exited with code $exit_code"
        exit $exit_code
    else
        echo "Electron development server stopped."
        exit 0
    fi
    ;;
"build")
    echo "Building all applications..."
    cd "$(dirname "$0")"
    cd dreambox-studio
    echo "Running in $(pwd)"
    bun run build
    ;;
"build:pwa")
    echo "Building PWA application..."
    cd "$(dirname "$0")"
    cd dreambox-studio
    echo "Running in $(pwd)"
    bun run build
    ;;
"build:electron")
    echo "Building Electron application using Quasar CLI..."
    echo "Note: For production builds, use 'w electron:local' or 'w electron:publish' instead"
    cd "$(dirname "$0")"
    cd dreambox-studio
    echo "Running in $(pwd)"
    bun run build -m electron
    ;;
"electron:local")
    echo "Building Electron application for local testing..."
    cd "$(dirname "$0")"
    cd dreambox-studio
    echo "Running in $(pwd)"
    node build-scripts/clean-build-local.js
    ;;
"electron:publish")
    echo "Building and publishing Electron application to GitHub..."
    cd "$(dirname "$0")"
    cd dreambox-studio
    echo "Running in $(pwd)"
    node build-scripts/clean-build.js
    ;;
"clean:dist")
    echo "Cleaning dist folder..."
    cd "$(dirname "$0")"
    cd dreambox-studio
    echo "Running in $(pwd)"
    node build-scripts/clean-dist.js
    ;;
"deploy:pwa")
    echo "Deploying PWA to production..."
    cd "$(dirname "$0")"
    cd dreambox-studio
    echo "Running in $(pwd)"
    bun run build && bun run deploy:pwa
    ;;
"component")
    if [ -z "$2" ]; then
        echo "Usage: w component <component-name> [type]"
        echo "Types: vue (default), page, layout, store"
        exit 1
    fi
    create_component "$2" "$3"
    ;;
"install")
    install_deps "$2" "$3"
    ;;
"update")
    update_main
    ;;
"db-inspector")
    shift
    echo "Running Database Inspector..."
    cd "$(dirname "$0")"
    cd db-inspector
    echo "Running in $(pwd)"

    if [ $# -eq 0 ]; then
        ./run.sh
    else
        ./run.sh "$@"
    fi
    ;;
"dbml")
    echo "Generating DBML file..."
    cd "$(dirname "$0")"
    cd dbml/scripts
    echo "Running in $(pwd)"

    # Check if bun is available, otherwise use node
    if command -v bun &>/dev/null; then
        bun run export_dbml.js
    else
        node export_dbml.js
    fi

    echo "DBML file generated at dbml/DBML/dreambox.dbml"
    ;;
"dbjson")
    echo "Generating database structure JSON..."
    cd "$(dirname "$0")"
    cd db-inspector
    echo "Running in $(pwd)"

    bun start

    echo "Database structure JSON generated at db-inspector/db-structure.json"
    ;;
"dbmd")
    echo "Generating database structure markdown..."
    cd "$(dirname "$0")"
    cd db-inspector
    echo "Running in $(pwd)"

    bun generate

    echo "Database structure markdown generated at db-inspector/database-structure.md"
    ;;
"test")
    echo "Running tests..."
    cd "$(dirname "$0")"
    cd dreambox-studio
    echo "Running in $(pwd)"

    # Extract any additional arguments
    shift

    # Run tests with Bun
    if [ $# -eq 0 ]; then
        # If no arguments, run all tests
        bun test
    else
        # If arguments are provided, pass them to bun test
        bun test "$@"
    fi
    ;;
"test:watch")
    echo "Running tests in watch mode..."
    cd "$(dirname "$0")"
    cd dreambox-studio
    echo "Running in $(pwd)"

    # Extract any additional arguments
    shift

    # Run tests with Bun in watch mode
    if [ $# -eq 0 ]; then
        # If no arguments, run all tests
        bun test --watch
    else
        # If arguments are provided, pass them to bun test
        bun test --watch "$@"
    fi
    ;;
"test:coverage")
    echo "Running tests with coverage..."
    cd "$(dirname "$0")"
    cd dreambox-studio
    echo "Running in $(pwd)"

    # Extract any additional arguments
    shift

    # Run tests with coverage
    if [ $# -eq 0 ]; then
        # If no arguments, run all tests with coverage
        bun test --coverage
    else
        # If arguments are provided, pass them to bun test
        bun test --coverage "$@"
    fi
    ;;
"pr-list")
    list_prs
    ;;
"pr-checkout")
    if [ -z "$2" ]; then
        echo "Usage: w pr-checkout <pr-number>"
        echo "Available PRs:"
        list_prs
        exit 1
    fi
    checkout_pr "$2"
    ;;
"pr-test")
    test_pr
    ;;
"pr-test-unit")
    test_pr_unit
    ;;
"pr-back")
    return_to_main
    ;;
"pr-merge")
    if [ -z "$2" ]; then
        echo "Usage: w pr-merge <pr-number> [merge-method]"
        echo "Merge methods: merge, squash (default), rebase"
        exit 1
    fi
    merge_pr "$2" "$3"
    ;;
"pr-view")
    if [ -z "$2" ]; then
        echo "Usage: w pr-view <pr-number>"
        exit 1
    fi
    view_pr "$2"
    ;;
"issue-list")
    list_issues
    ;;
"issue-create")
    if [ -z "$2" ]; then
        echo "Usage: w issue-create \"Title\" [\"Description\"] [\"label1,label2\"]"
        exit 1
    fi
    create_issue "$2" "$3" "$4"
    ;;
"issue-view")
    if [ -z "$2" ]; then
        echo "Usage: w issue-view <issue-number>"
        exit 1
    fi
    view_issue "$2"
    ;;
"issue-close")
    if [ -z "$2" ]; then
        echo "Usage: w issue-close <issue-number> [\"closing comment\"]"
        exit 1
    fi
    close_issue "$2" "$3"
    ;;
"issue-full")
    if [ -z "$2" ]; then
        echo "Usage: w issue-full \"Title\" [\"Description\"] [\"label1,label2\"] [milestone-number] [assignee]"
        exit 1
    fi
    create_issue_full "$2" "$3" "$4" "$5" "$6"
    ;;
"labels")
    list_labels
    ;;
"projects")
    list_projects
    ;;
"milestones")
    list_milestones
    ;;
"milestone-create")
    if [ -z "$2" ]; then
        echo "Usage: w milestone-create \"Title\" [\"Description\"] [\"YYYY-MM-DD\"]"
        exit 1
    fi
    create_milestone "$2" "$3" "$4"
    ;;
*)
    echo "Usage: w {start|finish|finish-force|abandon|release|publish|update|dev|build|deploy|component|install|electron:local|electron:publish|clean:dist|db-inspector|dbml|dbjson|dbmd|test|test:watch|test:coverage|pr-list|pr-checkout|pr-test|pr-test-unit|pr-back|pr-merge|pr-view|issue-list|issue-create|issue-view|issue-close|issue-full|labels|projects|milestones|milestone-create} [args]"
    echo ""
    echo "Commands:"
    echo "  start <branch-name>        - Start a new task branch"
    echo "  finish \"message\"           - Complete current task and merge to main"
    echo "  finish-force \"message\"     - Force complete task and overwrite main"
    echo "  abandon [new-branch]       - Abandon current task, optionally start new branch"
    echo "  release <type> \"msg\"       - Create a new release version"
    echo "  publish                    - Build and publish the current version"
    echo "  update                     - Quick update of main branch (must be on main)"
    echo ""
    echo "Quasar/Bun Commands:"
    echo "  dev                        - Start development server (default mode)"
    echo "  dev:pwa                    - Start PWA development server"
    echo "  dev:electron               - Start Electron development server"
    echo "  build                      - Build all applications"
    echo "  build:pwa                  - Build PWA application"
    echo "  build:electron             - Build Electron app using Quasar CLI (development)"
    echo "  electron:local             - Build Electron app for local testing"
    echo "  electron:publish           - Build and publish Electron app to GitHub"
    echo "  clean:dist                 - Clean the dist folder"
    echo "  deploy:pwa                 - Build and deploy PWA to production"
    echo "  component <name> [type]    - Create a new Quasar component (vue, page, layout, store)"
    echo "  install [package] [--dev]  - Install dependencies with Bun"
    echo "  db-inspector [command]     - Run database inspector (setup, fetch, generate, all)"
    echo "  dbml                       - Generate DBML file from database schema"
    echo "  dbjson                     - Generate database structure JSON file"
    echo "  dbmd                       - Generate database structure markdown file"
    echo "  test [file]                - Run tests (optionally specify file or pattern)"
    echo "  test:watch [file]          - Run tests in watch mode (auto-rerun on changes)"
    echo "  test:coverage [file]       - Run tests with coverage report"
    echo ""
    echo "Pull Request Commands (requires GitHub CLI):"
    echo "  pr-list                   - List all open Pull Requests"
    echo "  pr-checkout <pr-number>   - Checkout a PR branch for local testing"
    echo "  pr-test                   - Start dev server to test current PR branch"
    echo "  pr-test-unit              - Run unit tests on current PR branch"
    echo "  pr-back                   - Return to main branch after PR testing"
    echo "  pr-merge <pr-number>      - Approve and merge a PR (default: squash)"
    echo "  pr-view <pr-number>       - View detailed information about a PR"
    echo ""
    echo "GitHub Issues Commands (requires GitHub CLI):"
    echo "  issue-list                - List all open GitHub Issues"
    echo "  issue-create \"title\"      - Create a new issue (with optional description and labels)"
    echo "  issue-full \"title\"        - Create issue with full options (labels, milestone, assignee)"
    echo "  issue-view <issue-number> - View detailed information about an issue"
    echo "  issue-close <issue-number> - Close an issue (with optional comment)"
    echo ""
    echo "GitHub Organization Commands:"
    echo "  labels                    - List all available labels"
    echo "  projects                  - List all available projects"
    echo "  milestones                - List all available milestones"
    echo "  milestone-create \"title\"  - Create a new milestone (with optional description and due date)"
    echo ""
    echo "Examples:"
    echo "  w start fix-grid-layout                  - Start new task"
    echo "  w finish \"Fixed grid layout\"             - Complete task and merge to main"
    echo "  w finish-force \"Fixed grid layout\"       - Force complete task and overwrite main"
    echo "  w abandon                                - Just abandon current task"
    echo "  w abandon new-feature                    - Abandon and start new task \"new-feature\""
    echo "  w cleanup                                - Delete all merged branches"
    echo "  w release patch \"Bug fixes\"              - Release pathch with comment \"Bug fixes\""
    echo "  w release minor \"New features\"           - Release minor with comment \"New features\""
    echo "  w release major \"Breaking changes\"       - Release major with comment \"Breaking changes\""
    echo "  w publish                                - Build and publish the current version"
    echo "  w update                                 - Quick update of main branch"
    echo "  w dev                                    - Start development server"
    echo "  w dev:pwa                                - Start PWA development server"
    echo "  w dev:electron                           - Start Electron development server"
    echo "  w build                                  - Build all applications"
    echo "  w build:pwa                              - Build PWA application"
    echo "  w build:electron                         - Build Electron app (development only)"
    echo "  w electron:local                         - Build Electron app for local testing"
    echo "  w electron:publish                       - Build and publish Electron app to GitHub"
    echo "  w clean:dist                             - Clean the dist folder"
    echo "  w deploy:pwa                             - Build and deploy PWA to production"
    echo "  w component UserProfile                  - Create a new Vue component"
    echo "  w component UserList page                - Create a new page component"
    echo "  w install                                - Install all dependencies"
    echo "  w install axios                          - Install a specific package"
    echo "  w install vue-i18n --dev                 - Install a dev dependency"
    echo "  w db-inspector all                       - Run complete database inspection workflow"
    echo "  w dbml                                   - Generate DBML file from database schema"
    echo "  w dbjson                                 - Generate database structure JSON file"
    echo "  w dbmd                                   - Generate database structure markdown file"
    echo "  w test                                   - Run all tests"
    echo "  w test src/utils                         - Run tests in specific directory"
    echo "  w test:watch src/components              - Run component tests in watch mode"
    echo "  w test:coverage                          - Run all tests with coverage report"
    echo "  w pr-list                                - List all open Pull Requests"
    echo "  w pr-checkout 123                        - Checkout PR #123 for local testing"
    echo "  w pr-test                                - Test current PR branch with dev server"
    echo "  w pr-test-unit                           - Run unit tests on current PR branch"
    echo "  w pr-back                                - Return to main branch after testing"
    echo "  w pr-merge 123                           - Merge PR #123 using squash method"
    echo "  w pr-merge 123 rebase                    - Merge PR #123 using rebase method"
    echo "  w pr-view 123                            - View details of PR #123"
    echo "  w issue-list                             - List all open GitHub Issues"
    echo "  w issue-create \"Fix login bug\"                            - Create a simple issue"
    echo "  w issue-create \"Feature\" \"Description\" \"enhancement\"      - Create issue with description and labels"
    echo "  w issue-full \"Fix bug\" \"Details\" \"bug\" 1 \"kosirm\"         - Create issue with milestone and assignee"
    echo "  w issue-view 456                                          - View details of issue #456"
    echo "  w issue-close 456 \"Fixed in PR #123\"                      - Close issue with comment"
    echo "  w labels                                                  - List all available labels"
    echo "  w projects                                                - List all available projects"
    echo "  w milestones                                              - List all milestones"
    echo "  w milestone-create \"v1.0\" \"Milestone 1\" \"2024-12-31\"      - Create milestone with due date"
    exit 1
    ;;
esac
