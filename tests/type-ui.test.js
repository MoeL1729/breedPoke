import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {makePet,Game,validateState} from '../engine.js';
const db=JSON.parse(fs.readFileSync(new URL('../data/pokedex.json',import.meta.url)));
const code=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
function ui(){const ctx=vm.createContext({db});const esc=code.slice(code.indexOf('const esc='),code.indexOf('const wait='));const colors=code.slice(code.indexOf('const typeColors='),code.indexOf('let db,game'));const helpers=code.slice(code.indexOf('const typeSkin='),code.indexOf('const petSprite='));vm.runInContext(esc+colors+helpers,ctx);return ctx;}
test('all move cards including Gen-IV Curse render with a known type',()=>{const ctx=ui();for(const move of Object.values(db.moves)){assert.ok(db.types[move.typeId],`${move.name}: missing type`);ctx.move=move;const html=vm.runInContext('moveFace(move,0)',ctx);assert.ok(!html.includes('undefined'));assert.ok(html.includes(move.name));}});
test('unknown types render text without requesting nonexistent assets',()=>{const ctx=ui();for(const type of [10001,99999,null]){ctx.type=type;const html=vm.runInContext('badge(type)',ctx);assert.ok(html.includes('???'));assert.ok(!html.includes('<img'));}});
test('level 12 Gastly with Curse keeps its save and displays every move',()=>{const game=new Game(db);game.s.hatched=true;game.s.active=92;game.s.pets={92:makePet(db,92,12)};const before=JSON.stringify(game.s);validateState(db,JSON.parse(before));assert.ok(game.pet.moves.includes(174));const ctx=ui();for(const id of game.pet.moves){ctx.move=db.moves[id];assert.doesNotThrow(()=>vm.runInContext('moveFace(move,0)',ctx));}assert.equal(JSON.stringify(game.s),before);});
