package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	secret            []byte
	adminEmail        string
	adminPasswordHash string
}

func NewService(secret, adminEmail, adminPasswordHash string) *Service {
	return &Service{
		secret:            []byte(secret),
		adminEmail:        adminEmail,
		adminPasswordHash: adminPasswordHash,
	}
}

func (s *Service) VerifyCredentials(email, password string) error {
	if email != s.adminEmail {
		return errors.New("invalid credentials")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(s.adminPasswordHash), []byte(password)); err != nil {
		return errors.New("invalid credentials")
	}
	return nil
}

type Claims struct {
	Subject string `json:"sub"`
	jwt.RegisteredClaims
}

func (s *Service) IssueToken(subject string, ttl time.Duration) (string, error) {
	claims := Claims{
		Subject: subject,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "lightless",
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString(s.secret)
}

func (s *Service) ValidateToken(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	tok, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return s.secret, nil
	})
	if err != nil {
		return nil, err
	}
	if !tok.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}
