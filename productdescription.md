I'd like you to create an application to vote for uploaded pictures
The application should consist of 2 parts:

1. The frontoffice - mobile friendly webapp where a user can upload a photo from its device or take a picture and upload it
   - Every upload should be companioned with the name and emailaddress of the user.
   - Once the user has provided his emailaddress and name it should be automaticly filled in in following uploads (maybe us the localstorage of the browser)
2. The backoffice - webapp for administrators to vote for pictures
   - Login page: The first page is a login which request for the emailaddress of the user. This needs to be remembered in the session to couple it to votes on specific pictures
   - Gallery: a webpage with an overview of all uploaded pictures (keep a link with the uploaded metadata. The metadata should not be visible). Next to the picture should be a star button to allow the logged in admin to vote for the picture

- Leaderboard: page with an overview of all starred pictures. The pictures are sorted by number of votes. The picture with the most votes should be on top of the page. When clicked on the picture the metadata of the picture is shown.

This application consists of 2 parts:

- the frontoffice (web) enabling a user to upload a photo or take a picture and upload it. Each upload should by companiond with the emailaddress and name of the user.
- the backoffice (server): Takes the incoming pictures and stores them in a folder on the server. The folder has the emailadress as name. All the companioned metadata should be stored in a json file in the picture folder.
  The backoffice app contains a page showing the folder of the users who uploaded a picture. This page currently available under /uploads but should be under /gallery which should be the name of the page.
  A backoffice user can login into the backoffice with his emailaddress. When he is logged in he can vote for a picture by clicking on a star button.
  The backoffice should also have a leaderboard page which shows the pictures with a star. The picture are shown in order of the number of starts they got.
