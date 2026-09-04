import {Router} from "express";
import { GameError, createRoom, getRoomByCode, getRoomStandings } from "./game.js";

//express's way of destructuring functions and routes into separate files so that not everything is cluttered in the app
const router = Router();

router.post("/rooms", async(req, res) => {
    try {
        const {name, hostName} = req.body;
        if(!name || !hostName){
            return res.status(400).json({error: "name and hostName are required"});
        }
        const result = await createRoom({name, hostName, maxLots: req.body.maxLots});
        res.status(201).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Something went wrong"});
    }
});

router.get("/rooms/:code", async(req, res) => {
    try {
        const result = await getRoomByCode(req.params.code);
        if(!result) return res.status(404).json({error: "Room not Found"});
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Something went wrong"});
    }
});

router.get("/rooms/:code/standings", async(req, res) => {
    try {
        res.json(await getRoomStandings(req.params.code));
    } catch (error) {
        if(error instanceof GameError) return res.status(404).json({error: error.message});
        console.error(error);
        res.status(500).json({error: "Something went wrong"});
    }
});

export default router;