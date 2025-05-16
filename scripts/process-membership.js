const { Octokit } = require('@octokit/rest');
const core = require('@actions/core');
const github = require('@actions/github');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const context = github.context;

async function processMembershipRequest() {
  try {
    const issue = context.payload.issue;
    const issueNumber = issue.number;
    const issueBody = issue.body;
    const username = issue.user.login;
    const orgName = process.env.ORG_NAME;

    // Check if the issue title matches the expected format
    if (issue.title !== 'Request to join organization') {
      console.log('Not a membership request, skipping...');
      return;
    }

    // Extract information from the issue body
    const githubUsernameMatch = issueBody.match(/GitHub username:\s*(.+)/);
    const whyJoinMatch = issueBody.match(/Why I want to join:\s*(.+)/);
    const contributionMatch = issueBody.match(/What I can contribute:\s*(.+)/);

    if (!githubUsernameMatch || !whyJoinMatch || !contributionMatch) {
      await octokit.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNumber,
        body: `@${username} Please make sure to fill out all the required fields in the template:
- GitHub username
- Why you want to join
- What you can contribute

Once you've completed the template, we'll process your request.`
      });
      return;
    }

    const requestedUsername = githubUsernameMatch[1].trim();
    const whyJoin = whyJoinMatch[1].trim();
    const contribution = contributionMatch[1].trim();

    // Add label
    await octokit.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNumber,
      labels: ['membership-request']
    });

    // Invite user to the organization
    try {
      await octokit.orgs.createInvitation({
        org: orgName,
        invitee_id: issue.user.id
      });

      await octokit.issues.addLabels({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNumber,
        labels: ['approved']
      });

      await octokit.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNumber,
        body: `@${username} Thank you for your interest in joining ${orgName}! An invitation has been sent to your email. Please check your inbox and accept the invitation.

You can also view and accept the invitation directly on GitHub: https://github.com/orgs/${orgName}/invitation

Welcome to the ${orgName} organization! 🎉`
      });

      // Close the issue
      await octokit.issues.update({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNumber,
        state: 'closed'
      });
    } catch (error) {
      console.error('Error inviting user:', error);
      await octokit.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNumber,
        body: `@${username} Sorry, we encountered an issue while sending the invitation. Please try again later or contact an administrator.`
      });
    }
  } catch (error) {
    console.error('Error processing membership request:', error);
    core.setFailed(error.message);
  }
}

// Process the membership request
processMembershipRequest(); 