import React, { useState, Fragment, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import TeamCard from './TeamCard';
import AddTeam from './AddTeam';
import PlayerCard from './PlayerCard';
// import Team from './Team';
import Homepage from './Homepage';

const Team = lazy(()=>import("./Team"));

const App = () => {
 
  return (
  <BrowserRouter>
  <Suspense fallback={<div>Loading Team Info...</div>}>
    <Routes>
      <Route path='/' element={<Homepage/>}/>
      <Route path='/teams/:team_id' element={<Team/>}/>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
    </Suspense>
    </BrowserRouter>
  )

}

export default App
