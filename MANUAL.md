# The Great Train Robbery Manual

This is a 7-day Roguelike Game. Strange, finished in a hurry, not user-friendly.

The only input method is the keyboard. Available keys are always marked in the UI.

The main goal of the game is to successfully perform a heist. Instead of controlling a hero (or more), you are tasked with preparing the robbery by picking the right people, giving them the right equipment and, most importantly, giving them the right tasks.

Once the action is started, there is no way to directly influence the outcome. You can only pause and/or reset the heist.


## Hiring

...is very straightforward. You can pick from available townsfolk. Their names might give a hint about their strong and weak points. Firing a previously hired person is free of charge.


## Equipment

...is picked from a very limited General Store stock. One person can carry multiple items, with "weapons" limited to one and "horses" as well. Again, selling is free of charge.


## The Plan

...is easily the most complicated part of the game. It has two components: the starting location and the tasks.

### Locations

Every person in the party needs to be assigned a starting location. This is where they will be when the heist starts. There are two kinds of locations in the town:

  - Walk-through buildings: these are accessible through doors and windows.
  - Roofs: isolated areas that cannot be left; the advantage is greater range and safety from close-distance attacks.

### Tasks

Every person needs at least one assigned task. It is almost always better to add *more* tasks, simply because there is no additional "brain" or "logic". Every single behavior that you request must be specified via a task.

Every time your party members have to decide what to do, they will pick the first task that can be performed. For example: if the orders are specified as

1. RUN AWAY
2. SHOOT

then no shooting will happen (they will run away instead).

Some tasks are more important than others. For example, the main goal of the heist is to collect gold, and that will not happen without the "Collect gold" task.

The train is fast. It can be slowed down by shooting the locomotive.

The train carries gold. The gold will only be accessible if you manage do damage and disconnect a wagon. Be careful, though: once the gold is out, train guards will appear and start attacking.
