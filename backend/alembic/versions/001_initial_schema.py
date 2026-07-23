"""Initial schema with all models

Revision ID: 001_initial
Revises:
Create Date: 2026-06-30 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('password_hash', sa.String(), nullable=True),
        sa.Column('role', sa.Enum('venue_owner', 'player', 'admin', name='userrole'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    # Create sports table
    op.create_table(
        'sports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_sports_id'), 'sports', ['id'], unique=False)

    # Create venues table
    op.create_table(
        'venues',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('city', sa.String(), nullable=False),
        sa.Column('area', sa.String(), nullable=False),
        sa.Column('address', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_venues_area'), 'venues', ['area'], unique=False)
    op.create_index(op.f('ix_venues_city'), 'venues', ['city'], unique=False)
    op.create_index(op.f('ix_venues_id'), 'venues', ['id'], unique=False)

    # Create weekly_slots table
    op.create_table(
        'weekly_slots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('venue_id', sa.Integer(), nullable=False),
        sa.Column('sport_id', sa.Integer(), nullable=False),
        sa.Column('day_of_week', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('is_recurring', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['sport_id'], ['sports.id'], ),
        sa.ForeignKeyConstraint(['venue_id'], ['venues.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_weekly_slots_id'), 'weekly_slots', ['id'], unique=False)

    # Create bookings table
    op.create_table(
        'bookings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slot_id', sa.Integer(), nullable=False),
        sa.Column('booked_by_name', sa.String(), nullable=False),
        sa.Column('booked_by_phone', sa.String(), nullable=False),
        sa.Column('booking_date', sa.String(), nullable=False),
        sa.Column('status', sa.Enum('confirmed', 'cancelled', name='bookingstatus'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['slot_id'], ['weekly_slots.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slot_id', 'booking_date', name='uq_slot_date')
    )
    op.create_index(op.f('ix_bookings_id'), 'bookings', ['id'], unique=False)

    # Create venue_sports table
    op.create_table(
        'venue_sports',
        sa.Column('venue_id', sa.Integer(), nullable=False),
        sa.Column('sport_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['sport_id'], ['sports.id'], ),
        sa.ForeignKeyConstraint(['venue_id'], ['venues.id'], ),
        sa.PrimaryKeyConstraint('venue_id', 'sport_id')
    )

    # Create players table
    op.create_table(
        'players',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=False),
        sa.Column('city', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_players_id'), 'players', ['id'], unique=False)

    # Create player_positions table
    op.create_table(
        'player_positions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('player_id', sa.Integer(), nullable=False),
        sa.Column('sport_id', sa.Integer(), nullable=False),
        sa.Column('position_name', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['player_id'], ['players.id'], ),
        sa.ForeignKeyConstraint(['sport_id'], ['sports.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_player_positions_id'), 'player_positions', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_player_positions_id'), table_name='player_positions')
    op.drop_table('player_positions')
    op.drop_index(op.f('ix_players_id'), table_name='players')
    op.drop_table('players')
    op.drop_table('venue_sports')
    op.drop_index(op.f('ix_bookings_id'), table_name='bookings')
    op.drop_table('bookings')
    op.drop_index(op.f('ix_weekly_slots_id'), table_name='weekly_slots')
    op.drop_table('weekly_slots')
    op.drop_index(op.f('ix_venues_id'), table_name='venues')
    op.drop_index(op.f('ix_venues_city'), table_name='venues')
    op.drop_index(op.f('ix_venues_area'), table_name='venues')
    op.drop_table('venues')
    op.drop_index(op.f('ix_sports_id'), table_name='sports')
    op.drop_table('sports')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
