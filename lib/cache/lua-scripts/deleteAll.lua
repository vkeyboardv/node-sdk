--[[
Deletes all data from hash and zset.

Complexity: O(N) where N is the hash size.

KEYS:
    hash_name.
    zset_name.

Returns: nil.
]]--

local hash_name = KEYS[1]
local zset_name = KEYS[2]

redis.call('DEL', hash_name, zset_name)
