import React, {Fragment, useEffect, useState} from 'react';
import { BrowserRouter } from 'react-router-dom';
import TeamCard from './TeamCard';
import AddTeam from './AddTeam';
import PlayerCard from './PlayerCard';

const Homepage = () => {

  const[isClicked, setClicked] = useState(false);
  const[auctionStarted, setAuctionStarted] = useState(true);
  const[buttonText, setButtonText] = useState("Add Team");
  const[currentPlayer, setCurrentPlayer] = useState(null);


  const onAuctionEnd = async () => {
    // console.log("i have been summoned");
    
    try {
      const url = "http://localhost:3000/endauction"
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if(!response.ok){
        throw new Error("Failed to end Auction");
      }

      const result = response.json();
      console.log(result.message);
      setAuctionStarted(false);
    } catch (error) {
      console.log(error); 
    }
  }

  useEffect(()=>{
    const checkAuctionStatus = async () =>{
    try {
      const url = "http://localhost:3000/auctionstatus"
      const response = await fetch(url);
      const data = await response.json();
      setAuctionStarted(data.auction_started);
      console.log(data.auction_started);
    } catch (error) {
      console.log(error);
    }
    };
    checkAuctionStatus();
  }, [])

  async function getCurrentPlayer() {
    const url = "http://localhost:3000/currentplayer";
    try {
      const response = await fetch(url);
      const jsonData = await response.json();
      setCurrentPlayer(jsonData[0]);
      // console.log(jsonData[0].player_name);
      
      const current_player_id = jsonData[0].player_id;
      // console.log(current_player_id);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(()=>{
    if(!auctionStarted){
    getCurrentPlayer();
    }
  }, [auctionStarted]);

  const handleClick = () => {
    setClicked(!isClicked);
   setButtonText(isClicked?'Add Team':'Close')
  }

  return (
    <Fragment>
      <div className='heading'>
     <h1>IPL Auction</h1>
     </div>
     <div className="teamContainer">
    <TeamCard currentPlayer={currentPlayer}/>
    <button onClick={handleClick} className='addTeamBtn'>{buttonText}</button>
    {isClicked &&
    <AddTeam/>
}
  {!isClicked && !auctionStarted &&
    <button className='endAuctionBtn' onClick={onAuctionEnd}>Get Player</button>
  }
    <PlayerCard currentPlayer={currentPlayer} auctionStarted={auctionStarted} />
    </div>
    </Fragment>
  )
}

export default Homepage
