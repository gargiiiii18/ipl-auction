import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import cors from "cors";

const app = express();
const port = 3000;

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "ipl_auction",
    password: "Gargi18112004",
    port: 5432,
});
db.connect();

//middleware
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());
app.use(express.json());

let current_team_id=null;
let current_player_id=null;
let current_player = null;

async function getHighestBid(player_id){
    const all_bids_obj = await db.query("SELECT bids FROM players_bids WHERE player_id=$1", [player_id]);
    const all_bids = all_bids_obj.rows;
    const bids = [];
    all_bids.forEach(item=>{
        bids.push(item.bids);
    });
    // console.log(bids);
    const highest_bid = Math.max(...bids);
    // console.log(highest_bid);
    return highest_bid;
    
}

app.get("/result/:id", async (req, res)=>{
    try {
       const player_id = req.params.id;
    //    console.log(player_id);
       
        const result = await getHighestBid(player_id);
        // console.log(result);
        const winning_team_id_obj = await db.query("SELECT team_id FROM players_bids WHERE bids=$1", [result]);
        const winning_team_id = winning_team_id_obj.rows[0].team_id;
        // console.log(winning_team_id);
        const winning_team_obj = await db.query("SELECT team_name FROM teams WHERE team_id = $1", [winning_team_id]);
        const winning_team = winning_team_obj.rows[0].team_name;
        // console.log(winning_team);
        const player_price = await getHighestBid(player_id);
        // console.log(player_price);
        const new_team_budget_obj = await db.query("SELECT team_budget FROM teams WHERE team_id=$1", [winning_team_id]);
        let new_team_budget = new_team_budget_obj.rows[0].team_budget;
        new_team_budget = parseFloat(parseFloat(new_team_budget)-parseFloat(player_price));
        // console.log(new_team_budget);
        await db.query("UPDATE teams SET team_budget=$1 WHERE team_id = $2", [new_team_budget, winning_team_id]);
        res.json(`${winning_team} wins the bid`);

    } catch (error) {
        console.log(error);
        
    }
})

app.post("/teams/:id", async(req, res)=>{
    try {
        current_team_id=req.params.id;
        // console.log(current_team_id);
       //frontend: name of player to bid in input shd be player 
        const player_id_obj = await db.query("SELECT player_id FROM players WHERE player_name=$1", [req.body.player]);
        const player_id = player_id_obj.rows[0].player_id
        const bid = req.body.bid; //frontend: name of bid in input shd be bid
        const base_price_obj = await db.query("SELECT price FROM players WHERE player_id=$1", [player_id]);
        const base_price = base_price_obj.rows[0].price;
        const team_budget_obj = await db.query("SELECT team_budget FROM teams WHERE team_id=$1", [current_team_id]);
        const team_budget = team_budget_obj.rows[0].team_budget;
        if(parseFloat(team_budget)<parseFloat(base_price)){
            res.json("Not enough budget to bid for this player.");
        }
        else if(parseFloat(bid)<=parseFloat(base_price)){
            res.json("Bidding price is lesser than the base price")
        }
        else{
            await db.query("INSERT INTO players_bids VALUES ($1, $2, $3, $4, $5)", [player_id, base_price, current_team_id, team_budget, bid]);

        }
        // console.log(player_id);
        // console.log(bid);
        // console.log(base_price);
        // console.log(team_budget);   
    } catch (error) {
        console.log(error);
    }
})

app.get("/teams/:id", async (req, res)=>{
    try {
        const team_id = req.params.id;
        const team_players_obj = await db.query("SELECT * FROM players JOIN teams ON players.player_teamid=teams.team_id WHERE player_teamid=$1 ORDER BY players.player_id ASC", [team_id]);
        const team_players = team_players_obj.rows;
        if(team_players.length===0){
            res.json([]);
        }
        else{
            
            res.json(team_players);
        }

    } catch (error) {
        console.log(error);
    }
})


app.post("/teams", async (req, res)=>{
    try {
        const result = await db.query("SELECT * FROM teams")
        const length = result.rows.length;
        current_team_id=length+2;
    } catch (error) {
        console.log(error);
        
    }
   try {    
     await db.query("INSERT INTO teams VALUES ($1, $2, $3)", [current_team_id, req.body.team_name, req.body.team_budget]);
     // front end names: team_name, team_budget
     current_team_id+=1;
     res.status(200).json("Team added successfully");
   } catch (error) {
    console.log(error);
   }
})

app.get("/currentplayer", async (req, res)=>{
    try {
        if(!current_player){
        const player_obj = await db.query("SELECT * FROM players WHERE player_teamid IS NULL ORDER BY RANDOM() LIMIT 1");
        const player = player_obj.rows;
        
        current_player = player;
        current_player_id = player[0].player_id;
        }
        
        res.json(current_player);
    } catch (error) {
        console.log(error);  
    }
})

app.post("/endauction", async (req, res)=>{
    current_player = null;
    res.json({message: "Auction ended. Current player set to null"});
})

app.get("/", async (req, res)=>{
    try {
        const teams_obj = await db.query("SELECT * FROM teams ORDER BY team_id ASC");
        const teams = teams_obj.rows;
        // getHighestBid(1);
        res.json(teams);   
    } catch (error) {
        console.log(error);   
    }
})

app.listen(port, ()=>{
    console.log(`Server is running on port http://localhost:${port}`);
})