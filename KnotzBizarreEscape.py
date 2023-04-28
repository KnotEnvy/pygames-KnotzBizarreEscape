import pygame
import os
import random

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
TILE_SIZE = 75

#define player action variables
moving_left = False
moving_right = False
shoot = False
grenade = False
grenade_thrown = False

#load images
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


def draw_bg():
    screen.fill(BLACK)
    pygame.draw.line(screen, GREEN, (0, 400), (SCREEN_WIDTH, 400))



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


    def update(self):
        self.update_animation()
        self.check_alive()
        #update cooldown
        if self.shoot_cooldown > 0:
            self.shoot_cooldown -= 1
        

 

    def move(self, moving_left, moving_right):
        #reset movement variables
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

        #check collision with floor
        if self.rect.bottom + dy > 400:
            dy = 400 - self.rect.bottom
            self.in_air = False

        #update rect position
        self.rect.x += dx
        self.rect.y += dy


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

class ItemBox(pygame.sprite.Sprite):
    def __init__(self, item_type, x, y):
        pygame.sprite.Sprite.__init__(self)
        self.item_type = item_type
        self.image = item_boxes[self.item_type]
        self.rect = self.image.get_rect()
        self.rect.midtop = (x + TILE_SIZE // 2, y + (TILE_SIZE - self.image.get_height()))

    def update(self):
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
        self.rect.x += (self.direction * self.speed)
        #check if offscreen
        if self.rect.right < 0 or self.rect.left > SCREEN_WIDTH:
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
        self.direction = direction

    def update(self):
        
        self.vel_y += GRAVITY
        dx = self.direction * self.speed
        dy = self.vel_y

        #check collision with floor
        if self.rect.bottom + dy > 400:
            dy = 400 - self.rect.bottom
            self.speed = 0

        #check collision with walls
        #check if offscreen
        if self.rect.left + dx < 0 or self.rect.right + dx > SCREEN_WIDTH:
            self.direction *= -1
            dx = self.direction * self.speed
            
        #update grenade position
        self.rect.x += dx
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


#temp - creating item boxes
item_box = ItemBox('Health', 600, 300)
item_box_group.add(item_box)
item_box = ItemBox('Ammo', 500, 300)
item_box_group.add(item_box)
item_box = ItemBox('Grenade', 700, 300)
item_box_group.add(item_box)



player = Soldier('player', 200, 200, 1.75, 5, 20, 5) #these are the soldier class variables...
health_bar = HealthBar(10,10, player.health, player.health)

enemy = Soldier('enemy', 500, 350, 1.75, 2, 20, 0)
enemy2 = Soldier('enemy', 400, 350, 1.75, 3, 20, 0) 
enemy3 = Soldier('enemy', 600,350, 1.75, 2, 20, 0)   ##these are the soldier class variables...     
enemy_group.add(enemy)
enemy_group.add(enemy2)
enemy_group.add(enemy3)




    
run = True
while run:

    clock.tick(FPS)

    draw_bg()
    #show player health
    health_bar.draw(player.health)
    #show ammo
    draw_text(f'AMMO: ', font, WHITE, 10, 35)
    for x in range(player.ammo):
        screen.blit(bullet_img, (90 + (x *10), 40))
    #show health
    draw_text(f'HEALTH: {player.health}', font, WHITE, 10, 60)
       
    #show grenade
    draw_text(f'GRENADE: ', font, WHITE, 10, 85)
    for x in range(player.grenade):
        screen.blit(grenade_img, (130 + (x *15), 85))
    

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
    bullet_group.draw(screen)
    grenade_group.draw(screen)
    explosion_group.draw(screen)
    item_box_group.draw(screen)

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
            
        if player.in_air:
            player.update_action(2) #<--- jump
        elif moving_left or moving_right:
            player.update_action(1)  #<-- action#1 (run)
        else: 
            player.update_action(0)  #idle

        player.move(moving_left, moving_right)

    

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

