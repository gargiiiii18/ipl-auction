import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
const app = express();
const port = 3000;

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});
db.connect();

//middleware
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());
app.use(express.json());

let current_team_id = null;
let current_player_id = null;
let current_player = null;
let auction_started = false;


async function getHighestBid(player_id){
    const all_bids_obj = await db.query("SELECT bids FROM players_bids WHERE player_id=$1", [player_id]);
    const all_bids = all_bids_obj.rows;
    const bids = [];
    
    all_bids.forEach(item=>{
        bids.push(item.bids);
    });
    console.log(bids);
    
 
    const highest_bid = Math.max(...bids);
    console.log(highest_bid);
    
    return highest_bid;
    
}

async function checkCanBid(player_id){
    try {
        const base_price_obj = await db.query("SELECT price FROM players WHERE player_id=$1", [player_id]);
        const base_price = base_price_obj.rows[0].price;
        console.log(base_price);
        
        const teams_obj = await db.query("SELECT team_budget FROM teams");
        const teams = teams_obj.rows;
    
        for(let team of teams){
            if(parseFloat(team.team_budget)>parseFloat(base_price)){
                return true;
            }
        }
        return false;
        
    } catch (error) {
        console.log(error);
        return false;
    }
}

app.get("/result/:id", async (req, res)=>{
    try {
       const player_id = req.params.id;

       const no_of_bids = await db.query("SELECT player_id FROM players_bids WHERE player_id=$1", [player_id]);
       if(no_of_bids.rows.length==0){

        
        res.json({status: 'error', message: "No bids entered for this player"});
       }
       else{
        const result = await getHighestBid(player_id);
       console.log(result);
       
        const winning_team_id_obj = await db.query("SELECT team_id FROM players_bids WHERE bids=$1", [result]);
        const winning_team_id = winning_team_id_obj.rows[0].team_id;
       
        const winning_team_obj = await db.query("SELECT * FROM teams WHERE team_id = $1", [winning_team_id]);
        const winning_team = winning_team_obj.rows;
       
        const player_price = await getHighestBid(player_id);
     
        const team_budget_obj = await db.query("SELECT team_budget FROM players_bids WHERE team_id=$1", [winning_team_id]);
        let team_budget = team_budget_obj.rows[0].team_budget;
        let new_team_budget = parseFloat(parseFloat(team_budget)-parseFloat(player_price));
        
        await db.query("UPDATE teams SET team_budget=$1 WHERE team_id = $2", [new_team_budget, winning_team_id]);
        await db.query("UPDATE players SET player_teamid=$1 WHERE player_id=$2", [winning_team_id, player_id]);
     
        res.json({status: 'success', data: winning_team});
        auction_started = false;
    }

    } catch (error) {
        console.log(error);
        
    }
})

app.post("/teams/:id/check", async(req, res) => {
    try {
        if(current_player_id){
        const current_team_id=req.params.id;
        const team_budget_obj = await db.query("SELECT team_budget FROM teams WHERE team_id=$1", [current_team_id]);
        const team_budget = team_budget_obj.rows[0].team_budget;
        const existingBid = await db.query("SELECT * FROM players_bids WHERE team_id=$1 AND player_id=$2", [current_team_id, current_player_id]);
        if(existingBid.rows.length>0){
            res.json({status: "error", message: "You have already placed a bid for this player"});
        }
        const base_price_obj = await db.query("SELECT * FROM players WHERE player_id=$1", [current_player_id]);
        
        const base_price = base_price_obj.rows[0].price;
        if(parseFloat(team_budget)<=parseFloat(base_price)){

            res.json({status: "error", message: "Not enough budget to bid for this player."});
        }
        else{
            res.json({status: "success", message: "You can place a bid."});
        }
    }
    else{
        res.json({status: "error", message: "No players left"});
    }
    } catch (error) {
        console.log(error); 
    }
})

app.post("/teams/:id", async(req, res)=>{
    try {
        const current_team_id=req.params.id;
        const team_budget_obj = await db.query("SELECT team_budget FROM teams WHERE team_id=$1", [current_team_id]);
        const team_budget = team_budget_obj.rows[0].team_budget;
        
        const base_price_obj = await db.query("SELECT * FROM players WHERE player_id=$1", [current_player_id]);
        
        const base_price = base_price_obj.rows[0].price;
       
        const bid = req.body.bid; 
        
        if(parseFloat(bid)<=parseFloat(base_price)){
            res.json({status: "error", message: "Bidding price is lesser than the player's base price."});
        }
        else if(team_budget-bid < 0){
            res.json({status: "error", message: "Bid is out of your team budget"});
        }
        else{
            await db.query("INSERT INTO players_bids VALUES ($1, $2, $3, $4, $5)", [current_player_id, base_price, current_team_id, team_budget, bid]);
            console.log(bid);
            res.json({status: "success", message: "Bid successfully added."});
        }  
    } catch (error) {
        console.log(error);
    }
})

app.get("/teams/:id", async (req, res)=>{
    try {
        const team_id = req.params.id;
        const team_players_obj = await db.query("SELECT * FROM players JOIN teams ON players.player_teamid=teams.team_id WHERE player_teamid=$1 ORDER BY players.player_id ASC", [team_id]);
        const team_players = team_players_obj.rows;
       
        const team_obj = await db.query("SELECT * FROM teams WHERE team_id=$1", [team_id]);
        const team = team_obj.rows;
      
            res.json({team_players: team_players || [],
                       team: team || null 
            });

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
     current_team_id+=1;
     res.status(200).json("Team added successfully");
   } catch (error) {
    console.log(error);
   }
})

app.get("/currentplayer", async (req, res)=>{
    try {
        if(auction_started){
            return res.json(current_player);
        }
        if(!auction_started){
        const player_obj = await db.query("SELECT * FROM players WHERE player_teamid IS NULL ORDER BY RANDOM() LIMIT 1");
        const player = player_obj.rows;
        current_player = player;
        current_player_id = player[0].player_id;
        
        auction_started=true;
        }
        
        res.json(current_player);
    } catch (error) {
        console.log(error);  
    }
})


app.get("/auctionstatus", async (req, res)=>{
    res.json(auction_started);
    
})

app.post("/endauction", async (req, res)=>{
    current_player = null;
    auction_started=false;
    res.json({message: "Auction ended. Current player set to null"});
})

app.get("/", async (req, res)=>{
    try {
        const teams_obj = await db.query("SELECT * FROM teams ORDER BY team_id ASC");
        const teams = teams_obj.rows;
        res.json(teams);   
    } catch (error) {
        console.log(error);   
    }
})

app.listen(port, ()=>{
    console.log(`Server is running on port http://localhost:${port}`);
})