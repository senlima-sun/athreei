use anyhow::{Context, Result};
use git2::Repository;
use std::path::{Path, PathBuf};

pub struct WorktreeInfo {
    pub name: String,
    pub path: PathBuf,
    pub branch: Option<String>,
}

pub fn find_repo_root() -> Result<PathBuf> {
    let current = std::env::current_dir()?;
    let repo = Repository::discover(&current).context("Not in a git repository")?;
    let workdir = repo
        .workdir()
        .context("Repository has no working directory")?;
    Ok(workdir.to_path_buf())
}

pub fn create_worktree(name: &str, base_path: &Path) -> Result<PathBuf> {
    let repo_root = find_repo_root()?;
    let repo = Repository::open(&repo_root)?;

    let worktree_path = base_path.join(name);

    if worktree_path.exists() {
        return Ok(worktree_path);
    }

    let head = repo.head()?;
    let commit = head.peel_to_commit()?;

    let branch_name = format!("wc/{}", name);
    let branch_ref = match repo.find_branch(&branch_name, git2::BranchType::Local) {
        Ok(branch) => branch.into_reference(),
        Err(_) => {
            let branch = repo.branch(&branch_name, &commit, false)?;
            branch.into_reference()
        }
    };

    repo.worktree(
        name,
        &worktree_path,
        Some(git2::WorktreeAddOptions::new().reference(Some(&branch_ref))),
    )?;

    Ok(worktree_path)
}

pub fn remove_worktree(name: &str) -> Result<()> {
    let repo_root = find_repo_root()?;
    let repo = Repository::open(&repo_root)?;

    let worktree = repo.find_worktree(name)?;
    let worktree_path = worktree.path().to_path_buf();

    if worktree_path.exists() {
        std::fs::remove_dir_all(&worktree_path)?;
    }

    worktree.prune(Some(
        git2::WorktreePruneOptions::new()
            .valid(true)
            .working_tree(true),
    ))?;

    Ok(())
}

pub fn list_worktrees() -> Result<Vec<WorktreeInfo>> {
    let repo_root = find_repo_root()?;
    let repo = Repository::open(&repo_root)?;

    let worktree_names = repo.worktrees()?;
    let mut worktrees = Vec::new();

    for name in worktree_names.iter() {
        let name = name.context("Invalid worktree name")?;
        if let Ok(worktree) = repo.find_worktree(name) {
            let path = worktree.path().to_path_buf();
            let branch = None; // TODO: get branch name from worktree

            worktrees.push(WorktreeInfo {
                name: name.to_string(),
                path,
                branch,
            });
        }
    }

    Ok(worktrees)
}
