# NovaLib User Guide

NovaLib is a Windows desktop school library system by Novara Team. It is designed for high school libraries in Uganda, including O Level and A Level book tracking, optional library cards, shelf locations, lending, fines, reservations, and printable PDF reports.

## 1. Opening NovaLib

Use the main executable:

```text
dist\NovaLib.exe
```

The first launch can take a few seconds because Windows is unpacking the one-file app. If Windows shows an unknown publisher warning, choose **More info** and then **Run anyway**.

Default login:

```text
Username: admin@novalib.local
Password: admin123
```

After first login, change this password from **Settings -> Themes & Password**.

## 2. First Setup Checklist

1. Open `NovaLib.exe`.
2. Log in using the default admin account.
3. Go to **Settings -> School Profile**.
4. Enter the school name and address.
5. Choose the school logo or profile picture.
6. Go to **Settings -> Themes & Password** and choose a theme.
7. Change the default admin password.
8. Go to **Settings -> Admins** and add other librarians/admins.
9. Go to **Catalog** and add books with subject, level, shelf, and number of copies.
10. Go to **Members** and register students.

## 3. Main Screens

### Dashboard

The dashboard shows the school name/logo and library totals:

- Members
- Issued books
- Books
- Unpaid fines
- Requested books
- Quick access to catalog, members, circulation, and reservations

### Catalog

Use **Catalog** to add, search, edit, and export the book list.

When adding a book, fill in:

- Title
- Author
- Subject
- Level, such as `O Level`, `A Level`, `S1`, `S2`, `S3`, `S4`, `S5`, or `S6`
- ISBN, if available
- Publication date, if available
- Shelf, for example `O-MATH`, `A-BIO`, `S1-ENG`, `Shelf A`, or `Literature Rack`
- Number of copies

To edit an existing book:

1. Click the book in the catalog table.
2. The book details will appear on the right.
3. Change the needed fields.
4. Click **Update Selected**.

To export the catalog, click **Export Catalog PDF**.

### Members

Use **Members** to register students or library members.

The library card number is optional. If a student does not have a library card, the librarian can still find the student by:

- Student ID
- Name
- Email
- Account ID

To export the member list, click **Export Members PDF**.

### Circulation

Use **Circulation** for daily lending work.

#### Find Book

Search by:

- Book name
- Subject
- Author
- Shelf
- ISBN
- Class/level

The result shows whether the book is available and which shelf it is on. If a copy is available, use **Use Selected** to copy the available barcode into the checkout form.

#### Check-out

To issue a book:

1. Open **Circulation -> Check-out**.
2. Enter the student ID, name, email, account ID, or library card.
3. Enter or select the book barcode.
4. Click **Check-out Book**.

Default rule:

- Maximum books per student: `5`
- Checkout period: `10 days`

#### Return

To return a book:

1. Open **Circulation -> Return**.
2. Enter the book barcode.
3. Click **Return Book**.

If the book is late, NovaLib calculates the fine automatically.

Default fine:

```text
UGX 500 per late day
```

#### Renew

Use **Renew** to extend a loan. Renewal is blocked if:

- The student has unpaid fines.
- Another student has reserved the book.

#### Reserve

Use **Reserve** when a book is unavailable. NovaLib keeps reservations in order and shows them on the requested books page.

### Requested Books

Use **Requested Books** to view reservations and books that may need purchasing or restocking.

The report shows:

- Student/member
- Requested book
- Subject
- Level
- Available copies
- Action, such as `Purchase / restock`

To give the list to administration or purchasing, click **Export Requests PDF**.

### Fines

Use **Fines** to view late-return charges.

To export the fine list, click **Export Fines PDF**.

### Settings

Settings has three sections.

#### School Profile

Use this to update:

- School name
- Address
- School logo/profile picture

Keep the logo image in a stable folder. If the image is moved or deleted, NovaLib may not show it.

#### Admins

Use this to add another admin or librarian.

Each admin/librarian should have their own account. This makes it easier to know who processed library work.

#### Themes & Password

Use this to:

- Choose one of the 8 visual themes.
- Change the current admin/librarian password.

Password changes apply to the currently logged-in admin.

## 4. PDF Reports

NovaLib can export these reports as PDF documents:

- Catalog
- Members/students
- Fines
- Requested books/reservations

To export:

1. Open the screen you want.
2. Search or filter the table if needed.
3. Click the **Export ... PDF** button.
4. Choose where to save the PDF.
5. Open the PDF to print or share it.

The PDF contains the table currently shown on screen.

## 5. Data Storage and Backup

NovaLib stores its database on the computer running the app.

Default Windows database location:

```text
%LOCALAPPDATA%\Novara Team\NovaLib\novalib.sqlite3
```

Default log file location:

```text
%LOCALAPPDATA%\Novara Team\NovaLib\novalib.log
```

To back up the library data:

1. Close NovaLib.
2. Open the folder above.
3. Copy `novalib.sqlite3` to a flash disk, external drive, or safe backup folder.

To restore:

1. Close NovaLib.
2. Replace `novalib.sqlite3` with the backup copy.
3. Open NovaLib again.

Important: if you copy only `NovaLib.exe` to another computer, that computer will create its own separate database. To move the library records too, copy the database file as well.

## 6. Sharing NovaLib

To share the app with another Windows computer, copy:

```text
dist\NovaLib.exe
```

The other computer does not need Python installed.

Keep this file for troubleshooting:

```text
dist\NovaLib-Debug.exe
```

Use the debug version only if the normal app has a problem and you need a more detailed error.

## 7. Troubleshooting

### The app does not open

Try `NovaLib-Debug.exe`, then check the log file:

```text
%LOCALAPPDATA%\Novara Team\NovaLib\novalib.log
```

### Windows says the app is from an unknown publisher

This is expected for an unsigned prototype. Choose **More info** and **Run anyway**.

### The old icon still appears

Windows sometimes caches shortcut icons. Delete the old shortcut and create a new shortcut from the latest `NovaLib.exe`.

### A school logo does not display

Check that the image file still exists in the same folder selected in **Settings -> School Profile**.

### Login fails

Confirm the correct email/name and password. If the default admin password was changed and forgotten, another active admin can create a new librarian/admin account.

## 8. Good Library Practice

- Change the default password before real use.
- Give each librarian their own account.
- Back up the database regularly.
- Use clear shelf names, such as `O-MATH`, `A-BIO`, `S3-HIST`, or `Literature Rack`.
- Export requested books regularly for purchase planning.
- Keep student IDs consistent so checkout is fast even without library cards.
