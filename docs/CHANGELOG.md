# Changelog

All notable changes to the Pi Game project will be documented in this file.

## [1.6.1]
- Added a custom spinner loading indicator styled to match active theme colors, providing clear visual feedback during asset preloading and scene transitions.
- Designed dedicated static background scenes for all Rank C themes, giving lower-tier unlocks distinct visual identity and polish.
- Added animated Eldritch eyes atmospheric effects to enrich the background scenes of Eldritch-tier themes.
- Rebalanced drop rates, stats, and progression scaling across S, A, B, and C rank themes for a more balanced unlock curve.
- Redesigned the theme picker interface into a streamlined, single-column layout for clearer navigation and improved mobile responsiveness.

## [1.6.0]
- Added a black loader in the theme's colors and font: waits for fonts on first load, shows a general fact, ends with TAP TO START (which also starts the music). A short black wipe plays before each run.
- Moved fun facts and tips into js/facts-data.js with placeholders, per-category matching and no-repeat rotation; Game Over now picks stat facts and tips by digits, mode, reason and combo.
- Added tests/factstest.js; verified facts carry a source.

## [1.5.5]
- Pi Fright! music: unique tracks for the Common Halloween colours (Trick or Treat), Haunted Manor (Manor Hours), The Backrooms (Fluorescent Hum), Cursed Carnival (Cursed Calliope) and Eldritch Sky (Eldritch Drone).

## [1.5.4]
- Pi Fright!: added Haunted Manor (Epic) and Cursed Carnival (Mythic), both with animated scenes; the banner now has 10 themes.
- Cosmic Beginnings: added Neon Grid (Epic), Deep Sea (Legendary) and Aurora (Mythic), all with animated scenes.
- Updated banner descriptions, rates, README themes table, GACHA_BLUEPRINT and the gacha test.

## [1.5.3]
- Opened the Halloween banner, renamed "Pi Fright!", with a new description.
- Added 5 Common Halloween themes (Pumpkin, Witching Hour, Toxic Slime, Blood Moon, Graveyard Fog) using the Haunted Waltz music.
- Added The Backrooms (Legendary) and Eldritch Sky (Godly), both with animated pixel scenes.
- Rank change: Singularity is now Godly and Phosphor is Mythic; Singularity is the featured item in Cosmic Beginnings.
- Added LICENSE.md (MIT); updated README, GACHA_BLUEPRINT and the gacha test.

## [1.5.2]
- Replaced the logo-tap dev shortcut with console cheats: coins(n), unlockall(true|false), totalreset().
- Added a "Made with AI" credit (Claude, Gemini, GitHub Copilot) to About Us.
- Removed the rainbow outline from the Shop button; added hover tooltips on the Shop and Settings icons.
- Fixed the Pi Coin tooltip wording; made the pull-results window border visible.
- Music and SFX volume sliders now go up to 200%, with a safety limiter.
- Updated the Halloween banner text and the gacha test to the current roster; docs updated.

## [1.5.1]
- Fixed background page scrolling while dialogs or chest overlay pulls are active.
- Synchronized version tags across application files.

## [1.5.0]
- Implemented Gacha system with pull logic.
- Added shop functionality.

## [1.4.1]
- Resolved display issues in theme and audio sub-windows.
- Fixed layout bug causing scrollbars during window shake effects.
- Fixed settings menu scroll fade styling.

## [1.4.0]
- Overhauled score calculation math and timing mechanisms.
- Updated header layout and settings interface.

## [1.3.0]
- Reworked core theme selection system.
- Added Halloween theme.

## [1.2.0]
- Added Pi Coins currency system.
- Added Phosphor theme.
- Added per-theme background music (BGM) and custom track selector.
- Updated documentation for v1.2.

## [1.1.0]
- Introduced new scoring system.
- Added survival clock game mechanics.

## [1.0.0]
- Initial release of Pi Game.