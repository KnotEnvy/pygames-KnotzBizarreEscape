import pygame

pygame.init()
SCREEN_WIDTH = 800
SCREEN_HEIGHT = int(SCREEN_WIDTH * .8)

screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption('KnotzBizarreEscape')

#define player action variable
moving_right = False
moving_left = False


class Soldier(pygame.sprite.Sprite):
    def __init__(self, x, y, scale, speed):
        pygame.sprite.Sprite.__init__(self)
        self.speed = speed
        
        img= pygame.image.load('img/player/Idle/0.png').convert_alpha()
        self.image = pygame.transform.scale(img, (int(img.get_width() * scale), int (img.get_height() * scale)))
        self.rect = self.image.get_rect()
        self.rect.center = (x, y)

    def draw(self):
        screen.blit(self.image, self.rect)
        


player = Soldier(200, 200, 3)
player2 = Soldier(400, 200, 3)

x = 200
y = 200
scale = 3


def main():

    
    

    run= True
    while run:

        player.draw()
        





        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                run = False
            #keyboard controls
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_a:
                    moving_left = True
                if event.key == pygame.K_d:
                    moving_right = True
                if event.key == pygame.K_ESCAPE:
                    run = False
            if event.type == pygame.KEYUP:
                if event.key == pygame.K_a:
                    moving_left = False
                if event.key == pygame.K_d:
                    moving_right = False

        



        pygame.display.update()


    pygame.quit()

if __name__ == "__main__":
    main()
