# Production checklist

## Before going live

### Salesforce integration user (REQUIRED)
The n8n Connected App ("n8n Integration") is currently authorized under Ryan Pflughaupt's
personal Salesforce account. Before this integration handles real Closed Won opportunities:

1. Have a SF admin create a dedicated integration user (e.g. integration@engage2learn.org)
   with minimum permissions: read Opportunities, update custom fields on Opportunity
2. Re-authorize the n8n Salesforce credential under that integration user
3. If/when Salesforce write-back is enabled in the integration service, authorize that
   Connected App under the same integration user

Risk if skipped: n8n and write-back both break silently if Ryan's SF access changes.

---

### Salesforce write-back (PENDING TEAM DECISION)
Writing Kantata Project ID and Drive Folder URL back to the Salesforce Opportunity record
is not yet implemented. Placeholders exist in the codebase. Confirm with the team whether
this is needed before enabling.

Fields that would be written:
- Kantata_Project_ID__c
- Drive_Folder_URL__c

These custom fields would also need to be created in Salesforce by an admin before the
write-back step could run.
