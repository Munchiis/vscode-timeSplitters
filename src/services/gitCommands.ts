import { exec as childProcessExec } from 'child_process';
import { promisify } from 'util';

export const exec = promisify(childProcessExec);

// Function to get current branch
export async function getCurrentBranch(workspacePath: string): Promise<string> {
    const { stdout } = await exec('git rev-parse --abbrev-ref HEAD', { cwd: workspacePath });
    return stdout.trim();
}
