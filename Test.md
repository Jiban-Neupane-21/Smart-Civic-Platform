## Login as Superadmin 
* Email: superadmin@civic.gov.np
* Password: SuperAdmin@123!
* URL: http://localhost:8080/login
* Status: Success

## Create new municipality 
Status success

## Delete Unverified Municipality 
* Status success
`

## Login as Municipality Head
* Email: neupanejiban@gmail.com
* Password: @Neupane212
* URL: http://localhost:8080/login
* Status: Success

## first login password change 
* Status: success

## Municipality KYC Update 
Status: Error
PATCH http://localhost:3000/api/municipality/profile 401 (Unauthorized) 
I got the issue now that the new password  WHilw i first login and the password change the changes password is not update and while try to update kyc it show unauthorized or the token is not getting for updating the profile or the token is expired or not getting updated after password change
 but while i logout and try to login with new updated password kyc is updated
 Soo plan to how can i fix this issue 
 
 
## New Department Create
Status: Success
Email: munichead@gmail.com
Password: aee263c4d9b3


## Remove Department 
Status : Success


## Create new staff by municipality
Status: Success
Email: staff@gmail.com
Password:wEUOJl&05PN4

## Remove Staff 
Status: success


## first login password change  for department
* Status: success

## Department KYC Update 
Status: Error
PATCH http://localhost:3000/api/municipality/profile 401 (Unauthorized) 
I got the issue now that the new password  WHilw i first login and the password change the changes password is not update and while try to update kyc it show unauthorized or the token is not getting for updating the profile or the token is expired or not getting updated after password change
 but while i logout and try to login with new updated password kyc is updated
 Soo plan to how can i fix this issue 


## Create new staff by Department
Status: Success

## Remove Staff creation by municipality form department
Status: Success


## Update Staff Kyc
Status: Error
PATCH http://localhost:3000/api/staff/profile 401 (Unauthorized) 
I got the issue now that the new password  WHilw i first login and the password change the changes password is not update and while try to update kyc it show unauthorized or the token is not getting for updating the profile or the token is expired or not getting updated after password change
 but while i logout and try to login with new updated password it show time out exceeded but at that time it should show the login 
 Soo plan to how can i fix this issue 
 
 After reload page  it show KYC Verification Under Review
Your Staff KYC details have been submitted successfully and are currently pending review by your Department Head.

Once approved, you will gain full access to your assigned department queues, field work assignments, and operational rosters. this but while i try to login staff in another browser it  login successfully but  same browser where kyc is update i cant login if i go to login page it redirect to KYC Verification Under Review page 


## Kyc Verified of Municipality by superadmin for municipality 
Status: SUccess

## Kyc Verified of Department by Municipality 
Status: Success

## Kyc Verified of Staff by Municipality 
Status: issue 
Uncaught ReferenceError: Grid is not defined
    at ManageStaff (ManageStaff.tsx:1048:18)

## Kyc Verified of Staff by Department 
Status: Error
Uncaught ReferenceError: Grid is not defined
    at ManageStaff (ManageStaff.tsx:1048:18)
    


## Register New Citizen 
Status: Success

## Login as new citizen
Status: Success

## Submit new complain as Citizen by using register Address
Status: Success

## Submit new complain as Citizen by using Select mannually
Status: Success

## Submit new complain as Citizen by current Location
Status: Success


## Registered Complain Review by Department
Status: Success

