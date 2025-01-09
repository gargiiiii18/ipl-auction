# IPL Auction

IPL Auction is a website based game designed to manage and simulate an auction for IPL teams and players. It is a PERN stack project and is purely made-from-total-scratch. The project includes a PostgreSQL database, a React-based frontend, and a Node and Express backend that handles all the necessary logic and data retrieval.

If you'd like to contribute to my project, add additional features, etc, please fork the repository and use a feature branch. Pull requests are warmly welcome.

---

## Features

- **Teams Management**: Add and manage IPL teams with their budgets.
- **Players Management**: Display player details such as name, price, and skills.
- **Auction Functionality**: Teams can bid for players, and the system tracks the highest bid and winning team.
- **Results Display**: View the results of the auction, including the team that won a specific player.

---

## Screenshots

## Homepage
![Home Page](https://github.com/gargiiiii18/ipl-auction/blob/main/src/assets/homepage.png)

## Adding a team
<p float="left">
  <img src="https://github.com/gargiiiii18/ipl-auction/blob/main/src/assets/addintteam1.png" width="45%" />
  <img src="https://github.com/gargiiiii18/ipl-auction/blob/main/src/assets/addintteam2.png" width="45%" />
</p>

### Team Details and Adding a bid
<p float="left">
  <img src="https://github.com/gargiiiii18/ipl-auction/blob/main/src/assets/team.png" width="45%" />
  <img src="https://github.com/gargiiiii18/ipl-auction/blob/main/src/assets/addingbid.png" width="45%" />
</p>

## Result Display and Fund Updation
<p float="left">
  <img src="https://github.com/gargiiiii18/ipl-auction/blob/main/src/assets/result.png" width="45%" />
  <img src="https://github.com/gargiiiii18/ipl-auction/blob/main/src/assets/purseupdation.png" width="45%" />
</p>

## Tech Stack

### Frontend
- **React**: For building the user interface.
- **React Router**: For navigation and routing.

### Backend
- **Node.js**: For server-side logic.
- **Express.js**: For handling API routes.

### Database
- **PostgreSQL**: To store and manage teams, players, and bids data.

---

## Setup Instructions

### Prerequisites
- **Node.js**
- **PostgreSQL**
- **npm** or **yarn**

### Steps

1. Clone the repository:
   ```bash
   git clone <repository_url>
   cd ipl-auction
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the PostgreSQL database:
   - Install PostgreSQL if not already installed.
   - Create a database named `ipl_auction`.
   - Run the provided `setup.sql` file to create the necessary tables and populate initial data:
     ```bash
     psql -U <username> -d ipl_auction -f setup.sql
     ```

4. Start the backend server:
   ```bash
   nodemon server.js
   ```

5. Start the frontend development server:
   ```bash
   npm run dev
   ```

6. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```


## Contact

For any inquiries or issues, please contact me on the email mentioned on the profile.

