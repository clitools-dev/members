# GitHub Organization Membership Automation Tool

This tool automatically processes GitHub organization membership requests. When a user submits an issue with the title "Request to join organization" and fills out the required template, the system will process the application and wait for an organization owner's approval.

## Features

- Automatic detection of membership request issues
- Template validation
- Automatic application labeling
- Owner approval via comment
- Automatic organization invitation after approval
- Automatic application status updates

## Setup Steps

1. Fork this repository to your account
2. Add the following Secrets in your repository settings:
   - `GITHUB_TOKEN`: Provided by GitHub Actions by default
   - `ORG_NAME`: Your GitHub organization name

## Usage

### For Applicants
1. Create a new issue with the title "Request to join organization"
2. Fill out the required template fields:
   - GitHub username
   - Why you want to join
   - What you can contribute
3. Wait for an organization owner to review and approve your request

### For Organization Owners
1. Review the membership request
2. Comment "/approve" on the issue to approve the request
3. The system will automatically send an invitation to the applicant

## Issue Template

```markdown
👋 Hey there!

🚀 I would love to join the clitools-dev organization and contribute to building the best CLI tools directory!

## 📝 About me

- 👥 GitHub username: 
- 💬 Why I want to join: 
- 💻 What I can contribute: 

## 📚 Additional information

<!-- Feel free to add any other relevant information here -->

🌟 Looking forward to joining the community!
```

## Notes

- Ensure the account running the Actions has sufficient permissions to invite members
- It's recommended to configure appropriate member permissions in your organization settings
- Only organization owners can approve membership requests by commenting "/approve" 