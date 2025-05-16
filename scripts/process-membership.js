const { Octokit } = require('@octokit/rest');
const core = require('@actions/core');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

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

    // Add confirmation comment
    await octokit.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNumber,
      body: `@${username} Thank you for your application! We are processing your membership request.

Here's a summary of your application:
- GitHub Username: ${requestedUsername}
- Motivation: ${whyJoin}
- Contribution: ${contribution}

An organization owner will review your application. Please wait for their approval.`
    });

    // Add label
    await octokit.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issueNumber,
      labels: ['membership-request', 'pending-approval']
    });
  } catch (error) {
    console.error('Error processing membership request:', error);
    core.setFailed(error.message);
  }
}

// Function to handle comment events
async function handleComment() {
  try {
    const comment = context.payload.comment;
    const issue = context.payload.issue;
    const commenter = comment.user.login;
    const orgName = process.env.ORG_NAME;

    // Check if the comment is "/approve"
    if (comment.body.trim() !== '/approve') {
      return;
    }

    // Check if the commenter is an organization owner
    try {
      const membership = await octokit.orgs.getMembershipForUser({
        org: orgName,
        username: commenter
      });

      if (membership.data.role !== 'admin') {
        await octokit.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: issue.number,
          body: `@${commenter} Sorry, only organization owners can approve membership requests.`
        });
        return;
      }
    } catch (error) {
      console.error('Error checking membership:', error);
      await octokit.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issue.number,
        body: `@${commenter} Sorry, only organization owners can approve membership requests.`
      });
      return;
    }

    // Get the original issue author
    const issueAuthor = issue.user.login;

    // Invite user to the organization
    try {
      await octokit.orgs.createInvitation({
        org: orgName,
        invitee_id: issue.user.id
      });

      // Update labels
      await octokit.issues.removeLabel({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issue.number,
        name: 'pending-approval'
      });

      await octokit.issues.addLabels({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issue.number,
        labels: ['approved']
      });

      await octokit.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issue.number,
        body: `@${issueAuthor} Your membership request has been approved! An invitation has been sent to your email. Please check your inbox and accept the invitation.

Welcome to the ${orgName} organization! 🎉`
      });
    } catch (error) {
      console.error('Error inviting user:', error);
      await octokit.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issue.number,
        body: `@${issueAuthor} Sorry, we encountered an issue while sending the invitation. Please try again later or contact an administrator.`
      });
    }
  } catch (error) {
    console.error('Error processing comment:', error);
    core.setFailed(error.message);
  }
}

// Check the event type and call the appropriate function
if (context.eventName === 'issues') {
  processMembershipRequest();
} else if (context.eventName === 'issue_comment') {
  handleComment();
} 