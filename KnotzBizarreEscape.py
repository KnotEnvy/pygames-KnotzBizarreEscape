import pygame
import os
import random
import csv


pygame.init()


SCREEN_WIDTH = 800
SCREEN_HEIGHT = int(SCREEN_WIDTH * 0.8)

screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption('Shooter')

#set framerate
clock = pygame.time.Clock()
FPS = 60

#define game variables
GRAVITY = 0.75
SCROLL_THRESH = 200
ROWS = 16  #<-- dependant on the asset size
COLS = 150 #<-- dependant on how long you want your stage, times tile size
TILE_SIZE = SCREEN_HEIGHT // ROWS
TILE_TYPE = 21  #<-- defines the amount of assests you are pulling over with CSV
screen_scroll = 0
bg_scroll = 0
level = 1

#define player action variables
moving_left = False
moving_right = False
shoot = False
grenade = False
grenade_thrown = False

#load images
pine1_img = pygame.image.load('img/Background/pine1.png').convert_alpha()
pine2_img = pygame.image.load('img/Background/pine2.png').convert_alpha()
mountain_img = pygame.image.load('img/Background/mountain.png').convert_alpha()
sky_img = pygame.image.load('img/Background/sky_cloud.png').convert_alpha()

#store tiles in a list for world csv file
img_list = []
for x in range(TILE_TYPE):
    img = pygame.image.load(f'img/Tile/{x}.png')
    img = pygame.transform.scale(img, (TILE_SIZE, TILE_SIZE))
    img_list.append(img)
#bullet
bullet_img = pygame.image.load('img/icons/bullet.png').convert_alpha()
#grenade
grenade_img = pygame.image.load('img/icons/grenade.png').convert_alpha()
#item boxes
health_box_img = pygame.image.load('img/icons/health_box.png').convert_alpha()
ammo_box_img = pygame.image.load('img/icons/ammo_box.png').convert_alpha()
grenade_box_img = pygame.image.load('img/icons/grenade_box.png').convert_alpha()
item_boxes = {
    'Health'    :health_box_img,
    'Ammo'      :ammo_box_img,
    'Grenade'   :grenade_box_img
}


#define colours
BG = (144, 201, 120)
BLACK = (0,0,0)
WHITE = (255, 255, 255)
RED = (255, 0, 0)
GREEN = (0, 255, 0)


font = pygame.font.SysFont('Futura', 30)

#draw text on screen
def draw_text(text, font, text_col, x, y):
    img = font.render(text, True, text_col)
    screen.blit(img, (x, y))

#draw backgrounds
def draw_bg():
    screen.fill(BG)
    width = sky_img.get_width()
    for x in range(5):
        screen.blit(sky_img, ((x * width) - bg_scroll * .5,0))
        screen.blit(mountain_img, ((x * width) - bg_scroll * .6, SCREEN_HEIGHT - mountain_img.get_height()- 300))
        screen.blit(pine1_img, ((x * width) - bg_scroll * .7, SCREEN_HEIGHT - mountain_img.get_height()- 150))
        screen.blit(pine2_img, ((x * width) - bg_scroll *.8, SCREEN_HEIGHT - mountain_img.get_height()))


#updates the world tiles and data for level generation
class World():
    def __init__(self):
        self.obstacle_list = []

    def process_data(self, data):
        #iterate through each value in level data file
        for y, row in enumerate(data):
            for x, tile in enumerate(row):
                if tile >= 0:
                    img = img_list[tile]
                    img_rect = img.get_rect()
                    img_rect.x = x * TILE_SIZE
                    img_rect.y = y * TILE_SIZE
                    tile_data = (img, img_rect)

        #this is where you create tile data matching your assest... try to keep what we have below when naming files
                    if tile >= 0 and tile <= 8:
                        self.obstacle_list.append(tile_data)
                    elif tile >= 9 and tile <= 10:
                        water = Water(img, x * TILE_SIZE, y * TILE_SIZE)
                        water_group.add(water)
                        pass#water
                    elif tile >= 11 and tile <= 14:
                        decoration = Decoration(img, x * TILE_SIZE, y * TILE_SIZE)
                        decoration_group.add(decoration)
                    elif tile == 15:#create player
                        player = Soldier('player', x * TILE_SIZE, y * TILE_SIZE, 1.65, 5, 20, 5) #scale, speed, ammo, grenades...
                        health_bar = HealthBar(10,10, player.health, player.health)
                    elif tile == 16:#create enemies
                        enemy = Soldier('enemy', x * TILE_SIZE, y * TILE_SIZE, 1.65, 2, 20, 0) #scale, speed, ammo, grenades
                        enemy_group.add(enemy)
                    elif tile == 17:#create ammo box
                        item_box = ItemBox('Ammo', x * TILE_SIZE, y * TILE_SIZE)
                        item_box_group.add(item_box)
                    elif tile == 18:#create health box
                        item_box = ItemBox('Health', x * TILE_SIZE, y * TILE_SIZE)
                        item_box_group.add(item_box)
                    elif tile == 19:#create grenade box
                        item_box = ItemBox('Grenade', x * TILE_SIZE, y * TILE_SIZE)
                        item_box_group.add(item_box)
                    elif tile == 20:#create exit
                        exit = Exit(img, x * TILE_SIZE, y * TILE_SIZE)
                        exit_group.add(exit)
        return player, health_bar
    
    def draw(self):
        for tile in self.obstacle_list:
            tile[1][0] += screen_scroll
            screen.blit(tile[0], tile[1]) #<-- tile tuple, 0 = image of tile, 1 = rect of image


class Soldier(pygame.sprite.Sprite):
    def __init__(self, char_type, x, y, scale, speed, ammo, grenade):
        pygame.sprite.Sprite.__init__(self)
        self.alive =True
        self.char_type = char_type
        self.speed = speed
        self.ammo = ammo
        self.start_ammo = ammo
        self.shoot_cooldown = 0
        self.grenade = grenade
        self.health = 100
        self.max_health = self.health
        self.direction = 1
        self.vel_y = 0
        self.jump = False
        self.in_air = True
        self.flip = False
        self.animation_list = []
        self.frame_index = 0
        self.action = 0
        self.update_time = pygame.time.get_ticks()
        #create ai specific variables
        self.update_action(1)#1: run animation
        self.move_counter = 0
        self.vision = pygame.Rect(0, 0, 150 , 20)
        self.idle = False
        self.idle_counter = 0



        
        #load all images for players
        animation_types = ['Idle', "Run", "Jump", 'Death'] #<-- this is where you load the folders that house the animation png's
        for animation in animation_types:
            #reset temp list of images
            temp_list = []
            #count # of frames in folder
            num_of_frames = len(os.listdir(f'img/{self.char_type}/{animation}'))
            for i in range(num_of_frames):
                img = pygame.image.load(f'img/{self.char_type}/{animation}/{i}.png').convert_alpha()
                img = pygame.transform.scale(img, (int(img.get_width() * scale), int(img.get_height() * scale)))
                temp_list.append(img)
            self.animation_list.append(temp_list)
           
        self.image = self.animation_list[self.action][self.frame_index]
        self.rect = self.image.get_rect()
        self.rect.center = (x, y)
        self.width = self.image.get_width()
        self.height = self.image.get_height()


    def update(self):
        self.update_animation()
        self.check_alive()
        #update cooldown
        if self.shoot_cooldown > 0:
            self.shoot_cooldown -= 1
        

 

    def move(self, moving_left, moving_right):
        #reset movement variables
        screen_scroll = 0
        dx = 0
        dy = 0

        #assign movement variables if moving left or right
        if moving_left:
            dx = -self.speed
            self.flip = True
            self.direction = -1
        if moving_right:
            dx = self.speed
            self.flip = False
            self.direction = 1

        #jump
        if self.jump == True and self.in_air == False:
            self.vel_y = -11
            self.jump = False
            self.in_air = True
        #apply gravity
        self.vel_y += GRAVITY
        if self.vel_y > 10:
            self.vel_y = 10
        dy += self.vel_y


        #check for collision
        for tile in world.obstacle_list:
            #check collision in the x direction
            if tile[1].colliderect(self.rect.x + dx, self.rect.y, self.width, self.height):
                dx = 0
            #check for collision in the y direction
            if tile[1].colliderect(self.rect.x, self.rect.y + dy, self.width, self.height):
                #check if below the ground, i.e. jumping
                if self.vel_y < 0:
                    self.vel_y = 0
                    dy = tile[1].bottom - self.rect.top
                #check if above the ground, i.e. falling
                elif self.vel_y >= 0:
                    self.vel_y = 0
                    self.in_air = False
                    dy = tile[1].top - self.rect.bottom
       

        #update rect position
        self.rect.x += dx
        self.rect.y += dy

        #update scroll based on player position
        if self.char_type == 'player':
            if self.rect.right > SCREEN_WIDTH - SCROLL_THRESH or self.rect.left < SCROLL_THRESH:
                self.rect.x -= dx
                screen_scroll = -dx

        return screen_scroll


    def shoot(self):
        if self.shoot_cooldown == 0 and self.ammo > 0:
            self.shoot_cooldown = 20 #<--- reload speed #line below, is how far bullet is in front
            bullet = Bullet(self.rect.centerx + (0.8 * self.rect.size[0] * self.direction),\
                             self.rect.centery, self.direction) #<-- keeps bullet in front
            bullet_group.add(bullet)
            #reduce ammo
            self.ammo -= 1

    def ai(self):
        if self.alive and player.alive:
            if self.idle == False and random.randint(1, 200) == 1:
                self.update_action(0) #idle animation change
                self.idle = True
                self.idle_counter = 50
            #check if ai is near player
            if self.vision. colliderect(player.rect):
                #stop running and face player
                self.update_action(0) #0: idle animation
                #shoot
                self.shoot()
            else:
                if self.idle == False:
                    if self.direction == 1:
                        ai_moving_r = True
                    else:
                        ai_moving_r = False
                    ai_moving_l = not ai_moving_r
                    self.move(ai_moving_l, ai_moving_r)
                    self.update_action(1) #1: run animation change
                    self.move_counter += 1
                    #update enemy vision as they move
                    self.vision.center = (self.rect.centerx + 95 * self.direction, self.rect.centery) #pixel offset
                    #pygame.draw.rect(screen, RED, self.vision)  
                    if self.move_counter > TILE_SIZE:
                        self.direction *= -1
                        self.move_counter *= -1

                else: 
                    self.idle_counter -= 1
                    if self.idle_counter <= 0:
                        self.idle = False

        #scroll
        self.rect.x += screen_scroll



    def update_animation(self):
        #update animation
        ANIMATION_COOLDOWN = 100
        #update image depending on current frame
        self.image = self.animation_list[self.action][self.frame_index]
        #check if enough time has passed
        if pygame.time.get_ticks() - self.update_time > ANIMATION_COOLDOWN:
            self.update_time = pygame.time.get_ticks()
            self.frame_index += 1
        #if animation has run out reset back to start
        if self.frame_index >= len(self.animation_list[self.action]):
            if self.action == 3:
                self.frame_index = len(self.animation_list[self.action]) - 1
            else:
                self.frame_index = 0

    def update_action(self, new_action):
        #check for new actions
        if new_action != self.action:
            self.action = new_action
            #restart animation settings
            self.frame_index = 0
            self.update_time = pygame.time.get_ticks()
    
    def check_alive(self):
        if self.health <=0:
            self.health = 0
            self.speed = 0
            self.alive = False
            self.update_action(3)


    def draw(self):
        screen.blit(pygame.transform.flip(self.image, self.flip, False), self.rect)


class Decoration(pygame.sprite.Sprite):
    def __init__(self, img, x, y):
        pygame.sprite.Sprite.__init__(self)
        self.image = img
        self.rect = self.image.get_rect()
        self.rect.midtop = (x + TILE_SIZE // 2, y + (TILE_SIZE - self.image.get_height()))

    def update(self):
        self.rect.x += screen_scroll

class Water(pygame.sprite.Sprite):
    def __init__(self, img, x, y):
        pygame.sprite.Sprite.__init__(self)
        self.image = img
        self.rect = self.image.get_rect()
        self.rect.midtop = (x + TILE_SIZE // 2, y + (TILE_SIZE - self.image.get_height()))

    def update(self):
        self.rect.x += screen_scroll

class Exit(pygame.sprite.Sprite):
    def __init__(self, img, x, y):
        pygame.sprite.Sprite.__init__(self)
        self.image = img
        self.rect = self.image.get_rect()
        self.rect.midtop = (x + TILE_SIZE // 2, y + (TILE_SIZE - self.image.get_height()))

    def update(self):
        self.rect.x += screen_scroll

class ItemBox(pygame.sprite.Sprite):
    def __init__(self, item_type, x, y):
        pygame.sprite.Sprite.__init__(self)
        self.item_type = item_type
        self.image = item_boxes[self.item_type]
        self.rect = self.image.get_rect()
        self.rect.midtop = (x + TILE_SIZE // 2, y + (TILE_SIZE - self.image.get_height()))

    def update(self):
        #scroll
        self.rect.x += screen_scroll
        #check if player collision
        if pygame.sprite.collide_rect(self, player):
            #check what kind of box it was
            if self.item_type == 'Health':
                player.health += 25
                if player.health > player.max_health:
                    player.health = player.max_health
            elif self.item_type == 'Ammo':
                player.ammo += 20
            elif self.item_type == 'Grenade':
                player.grenade +=3
            self.kill()

class HealthBar():
    def __init__(self, x, y, health, max_health):
        self.x = x
        self.y = y
        self.health = health
        self.max_health = max_health

    def draw(self, health):
        #update current health
        self.health = health
        #calculate health
        ratio = self.health / self.max_health
        pygame.draw.rect(screen, BLACK,(self.x-2, self.y-2, 154, 24))
        pygame.draw.rect(screen, RED,(self.x, self.y, 150, 20))
        pygame.draw.rect(screen, GREEN,(self.x, self.y, 150 * ratio, 20))


class Bullet(pygame.sprite.Sprite):
    def __init__(self, x, y, direction):
        pygame.sprite.Sprite.__init__(self)
        self.speed = 10
        self.image = bullet_img
        self.rect = self.image.get_rect()
        self.rect.center = (x,y)
        self.direction = direction

    def update(self):
     #move bullet
        self.rect.x += (self.direction * self.speed) + screen_scroll
        #check if offscreen
        if self.rect.right < 0 or self.rect.left > SCREEN_WIDTH:
            self.kill()

        #check collision with level
        for tile in world.obstacle_list:
            if tile[1].colliderect(self.rect):
                self.kill()

        #collision checks with characters
        if pygame.sprite.spritecollide(player, bullet_group, False):
            if player.alive:
                player.health -= 5
                self.kill()
        for enemy in enemy_group:
            if pygame.sprite.spritecollide(enemy, bullet_group, False):
                if enemy.alive:
                    enemy.health -= 25
                    self.kill()

class Grenade(pygame.sprite.Sprite):
    def __init__(self, x, y, direction):
        pygame.sprite.Sprite.__init__(self)
        self.timer = 100
        self.vel_y = -11
        self.speed = 7
        self.image = grenade_img
        self.rect = self.image.get_rect()
        self.rect.center = (x,y)
        self.width =self.image.get_width()
        self.height = self.image.get_height()
        self.direction = direction

    def update(self):
        
        self.vel_y += GRAVITY
        dx = self.direction * self.speed
        dy = self.vel_y

        #check for collision with level
        for tile in world.obstacle_list:
            #check collision with walls
            if tile[1].colliderect(self.rect.x + dx, self.rect.y, self.width, self.height):
                self.direction *= -1
                dx = self.direction * self.speed
            #check for collision in the y direction
            if tile[1].colliderect(self.rect.x, self.rect.y + dy, self.width, self.height):
                self.speed = 0
                #check if below the ground, i.e. thrown up
                if self.vel_y < 0:
                    self.vel_y = 0
                    dy = tile[1].bottom - self.rect.top
                #check if above the ground, i.e. falling
                elif self.vel_y >= 0:
                    self.vel_y = 0
                    dy = tile[1].top - self.rect.bottom	
       

        #check collision with walls
        #check if offscreen
        if self.rect.left + dx < 0 or self.rect.right + dx > SCREEN_WIDTH:
            self.direction *= -1
            dx = self.direction * self.speed
            
        #update grenade position
        self.rect.x += dx + screen_scroll
        self.rect.y += dy

        #countdown timer
        self.timer -= 1
        if self.timer <= 0:
            self.kill()
            explosion = Explosion(self.rect.x, self.rect.y, 0.5)
            explosion_group.add(explosion)
            #do damamge to anyone nearby
            if abs(self.rect.centerx - player.rect.centerx) < TILE_SIZE * 2 and \
                abs(self.rect.centery - player.rect.centery) < TILE_SIZE * 2:
                player.health -= 50
            for enemy in enemy_group:
                if abs(self.rect.centerx - enemy.rect.centerx) < TILE_SIZE * 2 and \
                    abs(self.rect.centery - enemy.rect.centery) < TILE_SIZE * 2:
                    enemy.health -= 50

class Explosion(pygame.sprite.Sprite):
    def __init__(self, x, y, scale):
        pygame.sprite.Sprite.__init__(self)
        self.images = []
        for num in range(1, 6):
            img = pygame.image.load(f'img/explosion/exp{num}.png').convert_alpha()
            img = pygame.transform.scale(img, (int(img.get_width() * 1.25), int(img.get_height() * 1.25)))
            self.images.append(img)
        self.frame_index = 0
        self.image = self.images[self.frame_index]
        self.rect = self.image.get_rect()
        self.rect.center = (x,y)
        self.counter = 0

    def update(self):
        #scroll
        self.rect.x += screen_scroll
        EXPLOSION_SPEED = 4
        #update explosion animation
        self.counter += 1

        if self.counter >= EXPLOSION_SPEED:
            self.counter = 0
            self.frame_index += 1
            #if animation is complete delete explosion
            if self.frame_index >= len(self.images):
                self.kill()
            else:
                self.image = self.images[self.frame_index]


    

#sprite groups
enemy_group = pygame.sprite.Group()
bullet_group = pygame.sprite.Group()
grenade_group = pygame.sprite.Group()
explosion_group = pygame.sprite.Group()
item_box_group = pygame.sprite.Group()
decoration_group = pygame.sprite.Group()
water_group = pygame.sprite.Group()
exit_group = pygame.sprite.Group()









#create enpty tile list
world_data = []
for row in range(ROWS):
    r = [-1] * COLS
    world_data.append(r)
#load in level data and create world
with open(f'level{level}_data.csv', newline='') as csvfile:
    reader = csv.reader(csvfile, delimiter=',')
    for x, row in enumerate(reader):
        for y, tile in enumerate(row):
            world_data[x][y] = int(tile)
world = World()
player, health_bar = world.process_data(world_data)






    
run = True
while run:

    clock.tick(FPS)

    #update background
    draw_bg()
    world.draw()
    #show player health
    health_bar.draw(player.health)
    #show ammo
    draw_text(f'AMMO: ', font, WHITE, 10, 35)
    for x in range(player.ammo):
        screen.blit(bullet_img, (90 + (x *10), 40))
    #show health
    #draw_text(f'HEALTH: {player.health}', font, WHITE, 10, 60)
       
    #show grenade
    draw_text(f'GRENADE: ', font, WHITE, 10, 60)
    for x in range(player.grenade):
        screen.blit(grenade_img, (130 + (x *15), 60))
    

    player.update()
    player.draw()

    for enemy in enemy_group:
        enemy.ai()
        enemy.update()
        enemy.draw()

    #update and draw groups
    bullet_group.update()
    grenade_group.update()
    explosion_group.update()
    item_box_group.update()
    decoration_group.update()
    water_group.update()
    exit_group.update()
    bullet_group.draw(screen)
    grenade_group.draw(screen)
    explosion_group.draw(screen)
    item_box_group.draw(screen)
    decoration_group.draw(screen)
    water_group.draw(screen)
    exit_group.draw(screen)

    #check player actions
    if player.alive:
            #shot bullets
        if shoot:
            player.shoot()
        #throw grenades
        elif grenade and grenade_thrown == False and player.grenade > 0:
            grenade = Grenade(player.rect.centerx + (0.5 * player.rect.size[0] * player.direction),\
                        player.rect.top, player.direction)
            grenade_group.add(grenade)
            #reduce grenades
            player.grenade -= 1
            grenade_thrown = True
        #if player is jumping
        if player.in_air:
            player.update_action(2) #<--- jump
        elif moving_left or moving_right:
            player.update_action(1)  #<-- action#1 (run)
        else: 
            player.update_action(0)  #idle
        screen_scroll = player.move(moving_left, moving_right)
        bg_scroll -= screen_scroll

    #Keys and quit
    for event in pygame.event.get():
		#quit game
        if event.type == pygame.QUIT:
            run = False
        #keyboard presses
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_a:
                moving_left = True
            if event.key == pygame.K_d:
                moving_right = True
            if event.key == pygame.K_SPACE:
                shoot = True
            if event.key == pygame.K_q:
                grenade = True
            if event.key == pygame.K_w and player.alive:
                player.jump = True
            if event.key == pygame.K_ESCAPE:
                run = False
        #keyboard button released
        if event.type == pygame.KEYUP:
            if event.key == pygame.K_a:
                moving_left = False
            if event.key == pygame.K_d:
                moving_right = False
            if event.key == pygame.K_SPACE:
                shoot = False
            if event.key == pygame.K_q:
                grenade = False
                grenade_thrown = False




    pygame.display.update()


pygame.quit()

