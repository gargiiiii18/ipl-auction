//Copy the following commands to setup your database

//CREATE scripts:

CREATE DATABASE ipl_auction
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'English_India.1252'
    LC_CTYPE = 'English_India.1252'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;

CREATE TABLE public.teams
(
    team_id integer NOT NULL,
    team_name character varying(45),
    team_budget numeric NOT NULL,
    CONSTRAINT teams_pkey PRIMARY KEY (team_id),
    CONSTRAINT team_id_unique UNIQUE (team_id)
)

CREATE TABLE public.players
(
    player_id integer NOT NULL,
    player_name character varying(50),
    skills character varying(50),
    price numeric NOT NULL,
    player_teamid integer,
    CONSTRAINT players_pkey PRIMARY KEY (player_id)
)

CREATE TABLE public.players_bids
(
    player_id integer,
    price numeric,
    team_id integer,
    team_budget numeric,
    bids numeric
)

//insert team and player data in tables teams and players as per choice

INSERT INTO public.teams(
	team_id, team_name, team_budget)
	VALUES (?, ?, ?);

INSERT INTO public.players(
	player_id, player_name, skills, price, player_teamid)
	VALUES (?, ?, ?, ?, ?);

