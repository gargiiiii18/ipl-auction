import React from 'react'
import { useNavigate } from 'react-router-dom';

const WinnerCalculate = () => {
  
const navigate = useNavigate();

  const calculateResult = async () =>{
    const url = `http://localhost:3000/currentPlayer`;
    try {
      const response = await fetch(url);
      const current_player = await response.json();
      if(current_player && current_player.length>0){
        const player_id = current_player[0].player_id;
        // console.log(player_id);
        navigate(`result/${player_id}`);
      }
     else{
      console.log("No player data found.");
     }
    } catch (error) {
      console.log(error);
    }

  }

  return (
    <div>
      <button className="calculateResult"onClick={calculateResult}>Calculate Result</button>
    </div>
  )
}

export default WinnerCalculate
